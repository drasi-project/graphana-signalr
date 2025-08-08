import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DrasiQuery, DrasiDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<any, DrasiQuery, DrasiDataSourceOptions>(DataSource as any)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
