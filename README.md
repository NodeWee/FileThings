# FileThings

FileThings is a desktop file processing tool. For detailed introduction and download links of App, please visit the [FileThings website](https://filethings.net).

## Development

This project is a cross-platform application developed based on the [Tauri](https://tauri.app) framework.

### Development Environment Requirements

- Rust
- Node.js

### Build

1. Clone the repository:
   ```
   git clone https://github.com/nodewee/FileThingsApp.git
   cd FileThingsApp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run tauri dev
   ```

4. Build the app:
   ```
   npm run tauri build
   ```

Backend Rust code testing:
```
cd src-tauri
cargo test
```

## Contribution

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).
