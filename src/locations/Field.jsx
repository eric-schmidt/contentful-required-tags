import React, { useCallback, useEffect, useRef, useState } from "react";
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
import _ from "lodash";

// Since we're using the Tags metadata values already built into Contentful responses,
// this field should be `disabled in response` to prevent confusion when querying.

const Field = () => {
  // Init SDK.
  const sdk = useSDK();

  // Init state vars.
  const [isLoading, setIsLoading] = useState(true);
  const [isInvalid, setIsInvalid] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [updatedTags, setUpdatedTags] = useState([]);

  // Init ref vars.
  // `debouncedUpdateEntry` uses `useRef` so that we can maintain the same `_.debounce` throughout re-renders,
  // otherwise a new function is created each time, which defeats the purpose of the debounce.
  const debouncedUpdateEntry = useRef(null);

  // Init CMA plain client.
  const plainClient = createClient(
    { apiAdapter: sdk.cmaAdapter },
    {
      type: "plain",
      defaults: {
        environmentId: sdk.ids.environmentAlias ?? sdk.ids.environment,
        spaceId: sdk.ids.space,
      },
    }
  );

  // Get all available Tags from Contentful, as well as Tags that have already been selected.
  const getTags = useCallback(async () => {
    setIsLoading(true);

    // TODO: This could be filtered to a subset for different use cases (e.g. only show locale tags for permissions).
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
  }, [sdk.cma.tag, sdk.entry.metadata.tags]);

  // Utility function for sorting an array of objects based on the value of a nested key.
  const sortArrayOfObjectsAlphabeticallyByKey = ({ arr, key }) => {
    return arr.sort((a, b) => a[key].localeCompare(b[key]));
  };

  // TODO: Debounce / batch this so it can only fire once every couple of seconds, otherwise we hit entry version errors when items are clicked quickly in rapid succession.
  if (debouncedUpdateEntry.current === null) {
    debouncedUpdateEntry.current = _.debounce(async (updatedTags) => {
      console.log("IN DEBOUNCE");
      console.log("useRef: updatedTags", updatedTags);
      if (updatedTags.length > 0) {
        console.log("updatedTags.length > 0");
        // Get current entry, add tag, and update (i.e. save) entry.
        const entry = await plainClient.entry.get({
          entryId: sdk.entry.getSys().id,
        });

        entry.metadata.tags = [...entry.metadata.tags, ...updatedTags];
        plainClient.entry.update({ entryId: entry.sys.id }, entry);
        setUpdatedTags([]);
      }
    }, 2000);
  }

  // When an item is selected, add it to the list of selected tags and remove item from dropdown.
  const handleSelectItem = (selectedTag) => {
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

    // `updatedTags` are used to batch entry updates to prevent `versionMismatch` errors
    // when many tags are added in rapid succession. Tag metadata has a different shape
    // than `selectedTag`, which is why we have to create this manually here.
    const updatedTag = {
      sys: {
        type: "Link",
        linkType: "Tag",
        id: selectedTag.sys.id,
      },
    };
    setUpdatedTags((prevUpdatedTags) => [...prevUpdatedTags, updatedTag]);
  };

  // When an item is removed, remove it from the list of selected tags and add back to dropdown.
  // TODO: update this to leverage the same logic as `handleSelectItem` to debounce rapid button clicks.
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

    // TODO: How come we can't immediately re-add a tag once removed? E.g. Clicking a tag in the dropdown that was removed will not trigger a click event.
    // Get current entry, remove tag, and update (i.e. save) entry.
    const entry = await plainClient.entry.get({
      entryId: sdk.entry.getSys().id,
    });
    const nextTags = await entry.metadata.tags.filter(
      (tag) => tag.sys.id !== removedItem.sys.id
    );
    entry.metadata.tags = nextTags;
    // TODO: Need to specify version. There are occasional errors regarding VersionMismatch if the button is clicked too quickly. We either need to await version changes, or somehow batch/debounce if Tags are clicked quickly.
    plainClient.entry.update({ entryId: entry.sys.id }, entry);
  };

  // Automatically resize window based on element height, also accounting for absolute elements.
  useEffect(() => {
    sdk.window.startAutoResizer({ absoluteElements: true });
  }, [sdk.window]);

  // Get Tags on initial page load.
  useEffect(() => {
    getTags();
  }, [getTags]);

  // If selectedTags is empty, invalidate field to provide feedback to the user.
  // We are also populating/depopulating the field in `handleSelectItem` & `handleRemoveItem`,
  // leveraging Contentful's built-in required field validation to block publication if empty.
  useEffect(() => {
    if (selectedTags.length <= 0) {
      setIsInvalid(true);
      sdk.field.setValue(null);
    } else {
      setIsInvalid(false);
      sdk.field.setValue(true);
    }
  }, [sdk.field, selectedTags]);

  // TODO: Document why this is needed to batch things to prevent version errors.
  useEffect(() => {
    debouncedUpdateEntry.current(updatedTags);
    console.log("useEffect: updatedTags", updatedTags);
  }, [debouncedUpdateEntry, updatedTags]);

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
