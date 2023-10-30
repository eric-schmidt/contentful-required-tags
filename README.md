This project was bootstrapped with [Create Contentful App](https://github.com/contentful/create-contentful-app).

# Contentful Required Tags App

**This is a proof of concept, and should not be considered production-ready in any shape or form.**

This repo demonstrates how you might use a custom app to require users to add Tags to an entry. This app uses [Forma36](https://f36.contentful.com/) to port the UI elements seen on the Tags tab within the Contentful and add them as a required field within the entry editor. The primary file is [src/locations/Field.jsx](src/locations/Field.jsx).

## Instructions

1. Clone this repo.
2. Run `npm install` to install dependencies and `npm run start` to start a local version of this app.
3. Create a new app definition in Contentful, and point the definition to the locally running instance of this app (e.g. http://localhost:3000). When configuring this app definition, be sure to also select the `Entry field` location with a `Boolean` field type.
4. Add a new `Boolean` field to a content type, mark the field as required, and adjust the appearance to use the new app definition added above.
5. Navigate to an entry of the given content type, and you should see the field replaced with a tag selector that is similar to what is seen on the Tag tab.

## Available Scripts

In the project directory, you can run:

#### `npm start`

Creates or updates your app definition in Contentful, and runs the app in development mode.
Open your app to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

#### `npm run build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.
Your app is ready to be deployed!

#### `npm run upload`

Uploads the build folder to contentful and creates a bundle that is automatically activated.
The command guides you through the deployment process and asks for all required arguments.
Read [here](https://www.contentful.com/developers/docs/extensibility/app-framework/create-contentful-app/#deploy-with-contentful) for more information about the deployment process.

#### `npm run upload-ci`

Similar to `npm run upload` it will upload your app to contentful and activate it. The only difference is  
that with this command all required arguments are read from the environment variables, for example when you add
the upload command to your CI pipeline.

For this command to work, the following environment variables must be set:

- `CONTENTFUL_ORG_ID` - The ID of your organization
- `CONTENTFUL_APP_DEF_ID` - The ID of the app to which to add the bundle
- `CONTENTFUL_ACCESS_TOKEN` - A personal [access token](https://www.contentful.com/developers/docs/references/content-management-api/#/reference/personal-access-tokens)

## Libraries to use

To make your app look and feel like Contentful use the following libraries:

- [Forma 36](https://f36.contentful.com/) – Contentful's design system
- [Contentful Field Editors](https://www.contentful.com/developers/docs/extensibility/field-editors/) – Contentful's field editor React components

## Using the `contentful-management` SDK

In the default create contentful app output, a contentful management client is
passed into each location. This can be used to interact with Contentful's
management API. For example

```js
// Use the client
cma.locale.getMany({}).then((locales) => console.log(locales));
```

Visit the [`contentful-management` documentation](https://www.contentful.com/developers/docs/extensibility/app-framework/sdk/#using-the-contentful-management-library)
to find out more.

## Learn More

[Read more](https://www.contentful.com/developers/docs/extensibility/app-framework/create-contentful-app/) and check out the video on how to use the CLI.

Create Contentful App uses [Create React App](https://create-react-app.dev/). You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started) and how to further customize your app.
