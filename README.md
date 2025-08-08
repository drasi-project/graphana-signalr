# Drasi SignalR Data Source Plugin

A Grafana data source plugin that enables real-time streaming of data changes from Drasi SignalR endpoints. Perfect for building live dashboards that update automatically as your data changes.

## 🌟 Features

- **Real-time Streaming**: Live data updates through SignalR connections
- **Operation Support**: Handle insert, update, delete, and control operations
- **Snapshot Loading**: Load current data state on query initialization
- **Manual Reload**: Reload snapshot functionality with progress indication
- **Error Handling**: Comprehensive error reporting with user-friendly messages
- **Type Safety**: Built with TypeScript for robust development
- **Easy Setup**: Docker development environment included

## 🚀 Quick Start

### Prerequisites

- Grafana 8.0.0 or later
- Drasi platform with SignalR endpoint
- Node.js 18.x or later (for development)

### Installation

#### Option 1: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/drasi-project/grafana-signalr/releases)
2. Extract to your Grafana plugins directory
3. Enable `drasi-signalr` as an [unsigned plugin](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#allow_loading_unsigned_plugins)
4. Restart Grafana

#### Option 2: Development Setup

```bash
# Clone the repository
git clone https://github.com/drasi-project/grafana-signalr.git
cd grafana-signalr

# Install dependencies
npm install

# Build the plugin
npm run build

# Start Grafana with Docker
npm run server
```

Access Grafana at http://localhost:3002 (admin/admin)

## 📖 Configuration

### 1. Add Data Source

1. Navigate to **Configuration** → **Data Sources**
2. Click **Add data source**
3. Search for "Drasi SignalR" and select it
4. Configure the SignalR endpoint URL (e.g., `http://localhost:8080/hub`)
5. Click **Save & Test**

### 2. Create Query

1. Create a new dashboard or edit existing panel
2. Select "Drasi SignalR" as the data source
3. Configure query settings:
   - **Query ID**: The identifier for your Drasi query
   - **Load snapshot on start**: Enable to get current data state
4. Click **Apply**

## 🎯 Usage Examples

### Basic Real-time Dashboard

```yaml
# Example query configuration
Query ID: "user-activity"
Load snapshot on start: true
```

This will:
- Connect to your SignalR endpoint
- Stream real-time changes for "user-activity" query
- Load current data state when the panel initializes

### Multiple Queries

You can add multiple queries to a single panel to combine different data streams.

## 🔧 Development

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Docker (for testing environment)

### Setup

```bash
# Install dependencies
npm install

# Start development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run type checking
npm run typecheck

# Lint code
npm run lint
```

### Testing

```bash
# Unit tests
npm run test:ci

# End-to-end tests
npm run e2e

# Start test environment
docker-compose up --build
```

### Building

```bash
# Production build
npm run build

# Sign plugin (requires GRAFANA_ACCESS_POLICY_TOKEN)
npm run sign
```

## 🏗️ Architecture

### Data Flow

```
Drasi Platform → SignalR Endpoint → Plugin → Grafana Panel
```

### Operation Types

- **Insert (i)**: New data records
- **Update (u)**: Modified records (before/after states)
- **Delete (d)**: Removed records
- **Control (x)**: Control signals and metadata

### Error Handling

The plugin includes comprehensive error handling:
- Network connection issues
- Invalid query configurations  
- Data processing errors
- User-friendly error messages in the UI

## 📚 API Reference

### Plugin Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| signalrUrl | string | Yes | SignalR endpoint URL |

### Query Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| queryId | string | "" | Drasi query identifier |
| snapshotOnStart | boolean | false | Load current data on start |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Code Style

- Use TypeScript
- Follow existing code patterns
- Add tests for new features
- Update documentation

## 📊 Plugin Validation

This plugin is validated using the official Grafana plugin validator:

```bash
npx @grafana/plugin-validator@latest dist/
```

## 🔐 Security

- All connections use secure WebSocket protocols when possible
- No sensitive data is stored in browser localStorage
- Error messages don't expose sensitive system information

## 📋 Requirements

### Runtime Requirements
- Grafana 8.0.0+
- Modern web browser with WebSocket support

### Development Requirements
- Node.js 18.x or later
- npm 8.x or later
- Docker (for testing environment)

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
- Verify SignalR endpoint is accessible
- Check network connectivity
- Ensure CORS is configured properly

**No Data Showing**
- Verify Query ID exists in Drasi
- Check browser console for errors
- Ensure "Load snapshot on start" if you need current data

**Plugin Not Loading**
- Check Grafana logs for errors
- Verify plugin is properly signed (for production)
- Ensure Grafana version compatibility

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=* npm run dev
```

### Getting Help

1. Check the [Issues](https://github.com/drasi-project/grafana-signalr/issues) page
2. Review [Drasi Documentation](https://drasi.io/docs)
3. Join our [Community Discord](https://discord.gg/drasi)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Grafana](https://grafana.com/) for the excellent plugin framework
- [Drasi Project](https://drasi.io/) for the reactive data platform
- [SignalR](https://dotnet.microsoft.com/en-us/apps/aspnet/signalr) for real-time communication

## 📈 Roadmap

- [ ] Support for custom authentication methods
- [ ] Advanced filtering capabilities
- [ ] Performance optimizations for high-volume streams
- [ ] Additional visualization options
- [ ] Integration with Grafana alerting

---

Made with ❤️ by the [Drasi Team](https://drasi.io/)