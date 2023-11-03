import React, { useCallback, useState, useEffect } from "react";
import {
  Flex,
  Heading,
  List,
  Paragraph,
  TextLink,
} from "@contentful/f36-components";
import { css } from "emotion";
import { /* useCMA, */ useSDK } from "@contentful/react-apps-toolkit";

const ConfigScreen = () => {
  const [parameters, setParameters] = useState({});
  const sdk = useSDK();
  /*
     To use the cma, inject it as follows.
     If it is not needed, you can remove the next line.
  */
  // const cma = useCMA();
  const onConfigure = useCallback(async () => {
    // This method will be called when a user clicks on "Install"
    // or "Save" in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();
    return {
      // Parameters to be persisted as the app configuration.
      parameters,
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk]);

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.
      const currentParameters = await sdk.app.getParameters();
      if (currentParameters) {
        setParameters(currentParameters);
      }
      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk]);

  return (
    <Flex
      flexDirection="column"
      className={css({ margin: "80px", maxWidth: "800px" })}
    >
      <Heading>Contentful Required Tags App</Heading>
      <Paragraph>
        <strong>
          This is a proof of concept, and should not be considered
          production-ready in any shape or form.
        </strong>
      </Paragraph>
      <Paragraph>
        This app demonstrates how you might require users to add Tags to an
        entry by using{" "}
        <TextLink href="https://f36.contentful.com/" target="_blank">
          Forma36
        </TextLink>{" "}
        to port the UI elements seen on the Tags tab within the Contentful Web
        App and add them as a required field within the entry editor.
      </Paragraph>
      <Heading>Instructions</Heading>
      <List as="ol">
        <List.Item style={{ marginBottom: "1rem" }}>
          If you would like to limit with Tag groups are available per instance
          of this app, add an instance parameter called Tag Groups To Display (
          <code>tagGroupsToDisplay</code>) of type Short Text. This instance
          parameter should be populated with a comma-separated list of Tag
          groups (i.e. prefixes appearing before a <code>`:`</code> or other
          supported grouping symbol), which will then filter down the available
          Tags that content authors can select using this app. Here is some
          example help text to add for this instance parameter:{" "}
          <code>
            If you would like to limit the allowed Tags in this field to a
            specific group (e.g. Tags prefixed with a term + a colon), specify
            that group here. If you would like to allow multiple, separate
            values with a comma.
          </code>
        </List.Item>
        <List.Item style={{ marginBottom: "1rem" }}>
          Add a new <code>`Boolean`</code> field to a content type, mark the
          field as required, and adjust the appearance to use the new app
          definition added above. Since we're using the Tags metadata values
          already built into Contentful responses as the source of truth, this
          field should be
          <code>`disabled in response`</code> to prevent confusion when
          querying.
        </List.Item>
        <List.Item style={{ marginBottom: "1rem" }}>
          Navigate to an entry of the given content type, and you should see the
          field replaced with a Tag selector that is similar to what is seen on
          the Tag tab.
        </List.Item>
      </List>
    </Flex>
  );
};
export default ConfigScreen;
