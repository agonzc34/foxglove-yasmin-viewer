# foxgloveYasminViewer

## _A Foxglove Studio Extension_

Foxglove Yasmin Viewer is a custom Foxglove Extension for visualizing in real time the Finite Machine State for the [Yasmin State Machine]([https://github.com/foxglove/studio](https://github.com/uleroboticsgroup/yasmin). 

Tested in Node v20.9.0 and npm v10.1.0

## Develop

Extension development uses the `npm` package manager to install development dependencies and run build scripts.

To install extension dependencies, run `npm` from the root of the extension package.

```sh
npm install
```

You also need a modified version of the foxglove/schemas library, to generate the interfaces needed for the application to read the State Machine Messages. Download the extension at: [Foxglove Schema](https://github.com/foxglove/schemas) and place it next to the Foxglove Viewer directory.

Install the extension dependencies, copy the [setup/schemas.ts](setup/schemas.ts) in the Yasmin Viewer repo to the foxglove/schemas repo in internal/schemas.ts.

To generate the new interfaces for Foxglove, run:

```sh
npm run update-generated-files
```

To build and install the extension into your local Foxglove Studio desktop app, run:

```sh
npm run local-install
```

Open the `Foxglove Studio` desktop (or `ctrl-R` to refresh if it is already open). Your extension is installed and available within the app.

### Another option

Download the latest release of the repo and unzip the file inside the {foxglove_install_path}/extensions folder
