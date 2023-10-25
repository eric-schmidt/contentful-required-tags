import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Badge,
  Box,
  Form,
  FormControl,
  List,
  Pill,
  Skeleton,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";
import { useSDK } from "@contentful/react-apps-toolkit";
import { createClient } from "contentful-management";

// TODO: Change this to a Boolean (so that we can set True when tags are present, False when not for validation).
// TODO: This will also need to have the field disabled in response.
const Field = () => {
  // Init SDK.
  const sdk = useSDK();

  // Init state vars.
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // Gets the current entry to allow for further operations.
  // For some reason, `sdk.entry` or `sdk.cma.entry` do not
  // allow for the `update` operation, which Tags require.
  const getCurrentEntry = async () => {
    const client = createClient({ apiAdapter: sdk.cmaAdapter });
    const space = await client.getSpace(sdk.ids.space);
    const environment = await space.getEnvironment(
      sdk.ids.environmentAlias ?? sdk.ids.environment
    );
    const entry = await environment.getEntry(sdk.entry.getSys().id);

    return entry;
  };

  // Get all available Tags from Contentful, as well as Tags that have already been selected.
  const getTags = async () => {
    setIsLoading(true);

    // TODO: This could be filtered to a subset for different use cases (e.g. Regions for perms).
    // Get all available Tags and sort alphabetically.
    const availableTags = await sdk.cma.tag.getMany();
    const availableTagsSorted = sortArrayOfObjectsAlphabeticallyByKey({
      arr: availableTags.items,
      key: "name",
    });

    // Get all selected Tags, and merge data with `availableTags`, which
    // includes additional metadata, such as Name, Public/Private, etc.
    const initialSelectedTags = sdk.entry.metadata.tags;
    const normalizedSelectedTags = availableTagsSorted.filter(
      (availableTagsItem) => {
        return initialSelectedTags.some(
          (initialSelectedTagsItem) =>
            initialSelectedTagsItem.sys.id === availableTagsItem.sys.id
        );
      }
    );

    // Remove any selected tags from the list of available tags so that they cannot be selected twice.
    const availableTagsFiltered = availableTagsSorted.filter(
      (availableTag) =>
        !initialSelectedTags.some(
          (selectedTag) => selectedTag.sys.id === availableTag.sys.id
        )
    );

    // Update state.
    setAvailableTags(availableTagsFiltered);
    setSelectedTags(normalizedSelectedTags);
    setIsLoading(false);
  };

  // Utility function for sorting an array of objects based on the value of a nested key.
  const sortArrayOfObjectsAlphabeticallyByKey = ({ arr, key }) => {
    return arr.sort((a, b) => a[key].localeCompare(b[key]));
  };

  // When an item is selected, add it to the list of selected tags and remove item from dropdown.
  const handleSelectItem = async (selectedTag) => {
    // Add selected item to selected tags.
    const nextSelectedTags = sortArrayOfObjectsAlphabeticallyByKey({
      arr: [...selectedTags, selectedTag],
      key: "name",
    });
    setSelectedTags(nextSelectedTags);

    // Remove selected item from available tags.
    const nextAvailableTags = availableTags.filter(
      (availableTag) => availableTag.sys.id !== selectedTag.sys.id
    );
    setAvailableTags(nextAvailableTags);

    // Get current entry, add tag, and update (i.e. save) entry.
    const entry = await getCurrentEntry();
    entry.metadata.tags.push({
      sys: {
        type: "Link",
        linkType: "Tag",
        id: selectedTag.sys.id,
      },
    });
    entry.update();
  };

  // When an item is removed, remove it from the list of selected tags and add back to dropdown.
  const handleRemoveItem = async ({ removedItem }) => {
    // Remove item from selected tags.
    const nextSelectedTags = selectedTags.filter(
      (tag) => tag.sys.id !== removedItem.sys.id
    );
    setSelectedTags(nextSelectedTags);

    // Add item to available tags and sort alphabetically.
    const nextAvailableTags = sortArrayOfObjectsAlphabeticallyByKey({
      arr: [...availableTags, removedItem],
      key: "name",
    });
    setAvailableTags(nextAvailableTags);

    // Get current entry, remove tag, and update (i.e. save) entry.
    const entry = await getCurrentEntry();
    const nextTags = await entry.metadata.tags.filter(
      (tag) => tag.sys.id !== removedItem.sys.id
    );
    entry.metadata.tags = nextTags;
    // TODO: Apparently we need to specify version. There are occasional errors regarding VersionMismatch. Maybe this is why sdk.cma.entry.update() was not originally working?
    entry.update();
  };

  // Automatically resize window based on element height, also accounting for absolute elements.
  useEffect(() => {
    sdk.window.startAutoResizer({ absoluteElements: true });
  }, [sdk.window]);

  // Get Tags on initial page load.
  useEffect(() => {
    getTags();
  }, []);

  // If selectedTags are empty, invalidate field. We need to update
  // isInvalid state and also update sdk.field.setInvalid.
  // TODO: Update this to update the field so that we can prevent publication.
  useEffect(() => {
    !selectedTags.length
      ? sdk.field.setInvalid(true) && setIsInvalid(true)
      : sdk.field.setInvalid(false) && setIsInvalid(false);
  }, [sdk.field, selectedTags]);

  return (
    <Box style={{ padding: "3px" }}>
      <Box marginBottom="spacingM">
        {isLoading ? (
          <Skeleton.Container>
            <Skeleton.Image width="100%" height={50} />
            <Skeleton.Image width={250} height={35} offsetTop={65} />
          </Skeleton.Container>
        ) : (
          <Form>
            <FormControl isInvalid={isInvalid}>
              <Autocomplete
                isLoading={isLoading}
                items={availableTags}
                onSelectItem={handleSelectItem}
                closeAfterSelect={false}
                isRequired={true}
                textOnAfterSelect="clear"
                listWidth="full"
                itemToString={(item) => item.sys.id}
                renderItem={(item) => (
                  <Box>
                    {item.name}
                    <Box display="inline-flex" marginLeft="spacingM">
                      <Badge
                        variant={
                          item.sys.visibility === "public"
                            ? "positive"
                            : "primary"
                        }
                      >
                        {item.sys.visibility}
                      </Badge>
                    </Box>
                  </Box>
                )}
              />
              {isInvalid && (
                <FormControl.ValidationMessage>
                  Please select at least one tag.
                </FormControl.ValidationMessage>
              )}
            </FormControl>
          </Form>
        )}
      </Box>
      {!isLoading && (
        <List style={{ listStyle: "none", padding: 0 }}>
          {/* TODO: Add Tag groupings */}
          {selectedTags &&
            selectedTags.map((selectedTag) => {
              return (
                <List.Item
                  key={selectedTag.sys.id}
                  style={{ marginBottom: tokens.spacingXs }}
                >
                  <Pill
                    isDraggable={false}
                    onClose={() =>
                      handleRemoveItem({ removedItem: selectedTag })
                    }
                    label={selectedTag.name}
                  />
                  <Box display="inline-flex" marginLeft="spacingM">
                    <Badge
                      variant={
                        selectedTag.sys.visibility === "public"
                          ? "positive"
                          : "primary"
                      }
                    >
                      {selectedTag.sys.visibility}
                    </Badge>
                  </Box>
                </List.Item>
              );
            })}
        </List>
      )}
    </Box>
  );
};

export default Field;
