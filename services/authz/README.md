# OpenFGA Local Setup

## Installation

To use OpenFGA locally, you need to install the OpenFGA CLI and set up a local OpenFGA server. Please follow the official guide at:

[https://openfga.dev/docs/getting-started/cli](https://openfga.dev/docs/getting-started/cli)

This guide covers:

- Installing the OpenFGA CLI
- Running a local OpenFGA server
- Configuring the CLI to connect to your server
- Basic operations such as creating stores, writing models, and managing tuples

Refer to the documentation for details on authentication, model management, and advanced usage.

This is a local installation of OpenFGA (Fine-Grained Authorization).

## Available Endpoints

### Playground

Access the OpenFGA Playground UI at:

```
http://localhost:4082/playground
```

The playground provides a visual interface for testing authorization models and relationships.

### HTTP API

Connect to the OpenFGA HTTP API at:

```
https://localhost:4080
```

Note: The API uses HTTPS with local certificates. You may need to accept the self-signed certificate in your browser/client.

## Authentication

The service uses preshared key authentication. Include the key in your API requests using the Authorization header:

```
Authorization: Bearer dev-key-1
```

## Modular Authorization Models

Our authorization models are organized using OpenFGA's modular model system. This allows us to split authorization logic across multiple files and modules.

### Structure

- `services/authz/models/fga.mod`: The main manifest file that defines which modules are included
- `services/authz/models/xyz.fga`: The xyz bounded context authorization module

### Working with Models

To deploy the modular model to OpenFGA:

```sh
# Deploy the complete model using the manifest
fga model write --store-id=01JKBYH927ZKTK9N0SJWWAAXC0 --api-url=https://localhost:4080 --api-token=dev-key-1--file services/authz/models/fga.mod
```

To view the combined model:

```sh
# View the complete combined model
fga model get --store-id=$STORE_ID
```

>[INFO] CLI documentation at <https://openfga.dev/docs/getting-started/cli> and <https://github.com/openfga/cli>

## Testing

To verify your OpenFGA model definitions, run the following command:

```sh
# In the root of the project
fga model test --tests ./services/authz/models/organizations.fga.yaml
```

## Model Transformations

You can convert your OpenFGA model files to JSON format for integration with other tools.

For example, to transform your `library.fga` file into a JSON file, run:

```sh
# In the root of the project
fga model transform --input ./services/authz/models/organizations.fga --output ./services/authz/models/organizations.json
```

This command generates a JSON representation of your model.

## Adding New Bounded Contexts

1. Create a new `.fga` file in `services/authz/models/`
2. Add the `module` declaration at the top of the file
3. Add the file to `fga.mod` contents
4. Add tests `*.fga.yaml` files in `services/authz/models/`
5. Deploy the updated model using the commands above
