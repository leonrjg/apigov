<p align="center">
    <img src="src/assets/logo.png" alt="APIGov Logo"/>
</p>

## <img style="width:35px;vertical-align:sub" src="src/assets/icon.png"> APIGov <small>(alpha)</small>
#### Manage API dependencies and schema governance

This app tracks dependencies between microservices at field-level, allowing detection of breaking changes and easing initial mapping.

## Capabilities
- **Schema Manipulation**: Define input/output schemas on the JSON editor or visually on a table, keeping both synchronized
- **Dependency Analysis**: Track which components consume data from others
- **Visual**: Generate basic graphs describing the relationships between APIs
- **Import/Export**: JSON-based configuration for easy backup and sharing

## Screenshots
<img width="1624" height="1342" alt="image" src="https://github.com/user-attachments/assets/597f29de-e081-43f6-b74d-ecf9a776aa25" />
<img width="2058" height="1004" alt="image" src="https://github.com/user-attachments/assets/64be7590-35f4-4da8-9ae2-641fdd81018a" />
<img width="1530" height="606" alt="image" src="https://github.com/user-attachments/assets/e1fa7308-8706-4a9e-bb6c-d90c2c0cb3c6" />
<img width="1680" height="1138" alt="image" src="https://github.com/user-attachments/assets/a3264c33-cccd-4006-8c25-9bf710344c08" />
<img width="2088" height="1392" alt="image" src="https://github.com/user-attachments/assets/028d209c-b187-4885-8c8a-4993be9acaa0" />


## Stack
- **Framework**: Electron 35.0.0
- **Visualization**: D3.js for graphs, Excalidraw for diagrams
- **Styling**: TailwindCSS + DaisyUI
- **Storage**: Local JSON database

---

### TODO:
- Refactor to improve code quality and better adaptation to Electron's architecture
- Allowing importing/exporting directly from/to files
- Integrate with GitHub repositories to allow collaboration
  - Semantic JSON merging
