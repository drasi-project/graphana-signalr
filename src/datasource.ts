import {
  DataSourceInstanceSettings,
  DataFrame,
  FieldType,
  LoadingState,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  createDataFrame,
} from '@grafana/data';
import { Observable } from 'rxjs';
import { ReactionListener } from '@drasi/signalr-react';

import {
  DrasiQuery,
  DrasiDataSourceOptions,
} from './types';

export class DataSource extends DataSourceApi<DrasiQuery, DrasiDataSourceOptions> {
  annotations = {};
  private signalrUrl: string;
  private listeners: Map<string, ReactionListener> = new Map();
  private dataFrames: Map<string, DataFrame> = new Map();
  private datasets: Map<string, Map<string, any>> = new Map(); // queryId -> (rowKey -> rowData)

  constructor(instanceSettings: DataSourceInstanceSettings<DrasiDataSourceOptions>) {
    super(instanceSettings);
    this.signalrUrl = instanceSettings.jsonData.signalrUrl || 'http://localhost:8002/hub';
  }

  // Required method for Grafana to recognize this as a queryable data source
  getDefaultQuery(): Partial<DrasiQuery> {
    return {
      queryId: '',
      snapshotOnStart: false,
    };
  }

  // Required for data source to appear in query builder
  metricFindQuery(query: any): Promise<any[]> {
    return Promise.resolve([]);
  }

  // Filter out invalid queries
  filterQuery(query: DrasiQuery): boolean {
    return !!query.queryId && query.queryId.trim() !== '';
  }

  // Check if data source is working
  async checkHealth(): Promise<{ status: string; message: string }> {
    return this.testDatasource();
  }

  private observers: Map<string, any[]> = new Map();

  private getOrCreateListener(queryId: string): ReactionListener {
    if (!this.listeners.has(queryId)) {
      const listener = new ReactionListener(this.signalrUrl, queryId, (event) => {
        this.processChangeNotification(queryId, event);
        
        // Notify all observers for this query with complete refresh
        const queryObservers = this.observers.get(queryId) || [];
        const frame = this.getOrCreateDataFrame(queryId);
        
        // Send complete refresh - this replaces all previous data
        queryObservers.forEach(observer => {
          observer.next({
            data: [frame],
            state: LoadingState.Done, // Use Done instead of Streaming to replace data
            key: queryId,
          });
        });
      });
      this.listeners.set(queryId, listener);
    }
    return this.listeners.get(queryId)!;
  }

  private getOrCreateDataset(queryId: string): Map<string, any> {
    if (!this.datasets.has(queryId)) {
      this.datasets.set(queryId, new Map());
    }
    return this.datasets.get(queryId)!;
  }

  private getOrCreateDataFrame(queryId: string): DataFrame {
    if (!this.dataFrames.has(queryId)) {
      this.createDataFrameFromDataset(queryId);
    }
    return this.dataFrames.get(queryId)!;
  }

  private createDataFrameFromDataset(queryId: string, refId?: string): void {
    const dataset = this.getOrCreateDataset(queryId);
    const rows = Array.from(dataset.values());
    const frameRefId = refId || queryId;
    
    let frame: DataFrame;
    
    if (rows.length > 0) {
      const firstRow = rows[0];
      
      // Create fields based on the first row structure
      const fields = Object.keys(firstRow).map(key => {
        const value = firstRow[key];
        let fieldType = FieldType.string;
        
        if (typeof value === 'number') {
          fieldType = FieldType.number;
        } else if (typeof value === 'boolean') {
          fieldType = FieldType.boolean;
        } else if (value instanceof Date) {
          fieldType = FieldType.time;
        } else if (key.toLowerCase().includes('time') || key.toLowerCase().includes('date')) {
          fieldType = FieldType.time;
        }
        
        return {
          name: key,
          type: fieldType,
          values: rows.map(row => row[key]),
        };
      });
      
      frame = createDataFrame({ 
        fields, 
        refId: frameRefId,
        name: `Query ${frameRefId}`
      });
    } else {
      // Empty dataset - create frame with placeholder field
      frame = createDataFrame({ 
        fields: [{ name: 'id', type: FieldType.string, values: [] }],
        refId: frameRefId,
        name: `Query ${frameRefId} (empty)`
      });
    }
    
    this.dataFrames.set(queryId, frame);
  }

  private processChangeNotification(queryId: string, event: any): void {
    const dataset = this.getOrCreateDataset(queryId);
    let needsFrameRebuild = false;

    // Handle Drasi change notifications
    if (event.op) {
      switch (event.op) {
        case 'i': // Insert
          if (event.payload?.after) {
            const rowData = event.payload.after;
            const rowKey = this.generateRowKey(rowData);
            dataset.set(rowKey, { ...rowData });
            needsFrameRebuild = true;
          }
          break;

        case 'u': // Update
          if (event.payload?.before && event.payload?.after) {
            const beforeData = event.payload.before;
            const afterData = event.payload.after;
            
            // Find and remove the old row
            const oldRowKey = this.findRowByData(dataset, beforeData);
            if (oldRowKey) {
              dataset.delete(oldRowKey);
            }
            
            // Add the new row
            const newRowKey = this.generateRowKey(afterData);
            dataset.set(newRowKey, { ...afterData });
            needsFrameRebuild = true;
          }
          break;

        case 'd': // Delete
          if (event.payload?.before) {
            const beforeData = event.payload.before;
            const rowKey = this.findRowByData(dataset, beforeData);
            if (rowKey) {
              dataset.delete(rowKey);
              needsFrameRebuild = true;
            }
          }
          break;

        case 'x': // Control Signal
          // Control signals don't modify the dataset
          break;

        default:
          break;
      }
    }

    // Rebuild the data frame if the dataset changed
    if (needsFrameRebuild) {
      this.rebuildDataFrame(queryId);
    }
  }

  private generateRowKey(rowData: any): string {
    // Create a hash from all fields for consistent identity
    const sortedKeys = Object.keys(rowData).sort();
    const keyString = sortedKeys.map(key => `${key}:${JSON.stringify(rowData[key])}`).join('|');
    
    // Simple hash function (djb2 algorithm)
    let hash = 5381;
    for (let i = 0; i < keyString.length; i++) {
      hash = ((hash << 5) + hash) + keyString.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private findRowByData(dataset: Map<string, any>, targetData: any): string | null {
    for (const [key, rowData] of dataset.entries()) {
      if (this.objectsMatch(rowData, targetData)) {
        return key;
      }
    }
    return null;
  }

  private objectsMatch(obj1: any, obj2: any): boolean {
    const keys2 = Object.keys(obj2);
    
    // Check if all keys in obj2 exist in obj1 and have matching values
    for (const key of keys2) {
      if (obj1[key] !== obj2[key]) {
        return false;
      }
    }
    
    return true;
  }

  private rebuildDataFrame(queryId: string): void {
    // Preserve the existing refId if we have one
    const existingFrame = this.dataFrames.get(queryId);
    const existingRefId = existingFrame?.refId;
    
    // Remove the old frame
    this.dataFrames.delete(queryId);
    
    // Create a new frame from the current dataset with the same refId
    this.createDataFrameFromDataset(queryId, existingRefId);
  }

  private async performReload(queryId: string): Promise<void> {
    const listener = this.getOrCreateListener(queryId);
    
    return new Promise((resolve, reject) => {
      try {
        listener.reload((data: any[]) => {
          try {
            // Clear the existing dataset
            const dataset = this.getOrCreateDataset(queryId);
            dataset.clear();
            
            // Add each snapshot item to the dataset
            data.forEach((item) => {
              const rowKey = this.generateRowKey(item);
              dataset.set(rowKey, { ...item });
            });
            
            // Rebuild the data frame from the new dataset
            this.rebuildDataFrame(queryId);
            
            // Notify all observers for this query with the refreshed data
            const queryObservers = this.observers.get(queryId) || [];
            const frame = this.getOrCreateDataFrame(queryId);
            
            queryObservers.forEach(observer => {
              observer.next({
                data: [frame],
                state: LoadingState.Done,
                key: queryId,
              });
            });
            
            resolve();
          } catch (processingError) {
            const errorMessage = processingError instanceof Error ? processingError.message : String(processingError);
            console.error('Error processing reload data:', processingError);
            reject(new Error(`Failed to process reload data: ${errorMessage}`));
          }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Reload error:', error);
        reject(new Error(`Failed to initiate reload: ${errorMessage}`));
      }
    });
  }

  query(options: DataQueryRequest<DrasiQuery>): any {
    
    return new Observable<DataQueryResponse>((observer: any) => {
      // Handle multiple targets by merging them into a single response
      const activeQueries = options.targets.filter(target => target.queryId && target.queryId.trim() !== '');
      
      if (activeQueries.length === 0) {
        observer.next({
          data: [],
          state: LoadingState.Error,
          error: { message: 'No valid query IDs provided' },
          key: 'error',
        });
        observer.complete();
        return;
      }

      const setupQueries = async () => {
        try {
          const frames: DataFrame[] = [];
          
          for (const target of activeQueries) {
            try {
              // Register this observer for the query
              if (!this.observers.has(target.queryId)) {
                this.observers.set(target.queryId, []);
              }
              this.observers.get(target.queryId)!.push(observer);
              
              // Get or create listener for this query
              this.getOrCreateListener(target.queryId);
              
              // Perform initial snapshot if requested
              if (target.snapshotOnStart) {
                await this.performReload(target.queryId);
              }

              // Create frame with correct refId
              this.createDataFrameFromDataset(target.queryId, target.refId || target.queryId);
              const frame = this.getOrCreateDataFrame(target.queryId);
              frames.push(frame);
              
            } catch (queryError) {
              const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
              console.error(`Failed to setup query ${target.queryId}:`, queryError);
              
              // Send error for this specific query
              observer.next({
                data: [],
                state: LoadingState.Error,
                error: { message: `Failed to setup query "${target.queryId}": ${errorMessage}` },
                key: target.queryId,
              });
              return; // Exit early on query setup failure
            }
          }

          // Send single response with all frames if all queries succeeded
          observer.next({
            data: frames,
            state: LoadingState.Streaming,
            key: activeQueries.map(t => t.queryId).join(','),
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('Failed to setup queries:', error);
          observer.next({
            data: [],
            state: LoadingState.Error,
            error: { message: `Failed to setup queries: ${errorMessage}` },
            key: 'error',
          });
        }
      };

      setupQueries();
      
      // Return cleanup function
      return () => {
        for (const target of activeQueries) {
          const queryObservers = this.observers.get(target.queryId);
          if (queryObservers) {
            const index = queryObservers.indexOf(observer);
            if (index > -1) {
              queryObservers.splice(index, 1);
            }
            if (queryObservers.length === 0) {
              this.observers.delete(target.queryId);
            }
          }
        }
      };
    });
  }

  async testDatasource(): Promise<{ status: string; message: string }> {
    try {
      // Create a test listener to verify basic configuration
      new ReactionListener(this.signalrUrl, 'test', () => {});
      
      return {
        status: 'success',
        message: 'Successfully connected to SignalR endpoint',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        message: `Failed to connect: ${errorMessage}`,
      };
    }
  }

  async dispose() {
    // Clean up all listeners
    this.listeners.clear();
    this.dataFrames.clear();
    this.datasets.clear();
    this.observers.clear();
  }

  // Public method to allow QueryEditor to trigger reload
  async reloadSnapshot(queryId: string): Promise<void> {
    return this.performReload(queryId);
  }
}
