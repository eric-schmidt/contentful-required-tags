import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Autocomplete,
  Badge,
  Box,
  Form,
  List,
  Pill,
  Skeleton,
} from "@contentful/f36-components";
import tokens from "@contentful/f36-tokens";
import { useSDK } from "@contentful/react-apps-toolkit";
import _ from "lodash";

const Field = () => {
  // Init SDK.
  const sdk = useSDK();

  // Init state vars.
  const [isLoading, setIsLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [groupedSelectedTags, setGroupedSelectedTags] = useState([]);
  const [updatedTags, setUpdatedTags] = useState([]);
  const [tagOperation, setTagOperation] = useState("");

  // Init ref vars.
  // `debouncedUpdateEntry` uses `useRef` so that we can maintain the same `_.debounce` function throughout
  // re-renders, otherwise a new function is created each time, which defeats the purpose of the debounce.
  const debouncedUpdateEntry = useRef(null);

  // Get this App's instance parameters for later use.
  const { tagGroupsToDisplay } = sdk.parameters.instance;

  // Utility function for properly formatting a tag before it is appended to entry metadata.
  const formatTagMetadataObject = (tagId) => {
    return {
      sys: {
        type: "Link",
        linkType: "Tag",
        id: tagId,
      },
    };
  };

  // Utility function for splitting the prefixed Tag group name from a Tag.
  const getTagGroupName = (tag) => {
    // Split the name at the first supported grouping symbol.
    const splitTagName = tag.name.split(/[-:._#]/, 2);
    // Extract the text before the colon as the key.
    return splitTagName[0].trim();
  };

  // Utility function for sorting an array of objects based on the value of a nested key.
  const sortArrayOfObjectsAlphabeticallyByKey = ({ arr, key }) => {
    return arr.sort((a, b) => a[key].localeCompare(b[key]));
  };

  // Get all available Tags from Contentful, as well as Tags that have already been selected.
  // These Tags may be filtered based on arbitrary Tag groups. See repo README for more info.
  const getTags = useCallback(async () => {
    // Show loading state.
    setIsLoading(true);

    // Get all tags for the given space.
    const allTags = await sdk.cma.tag.getMany();

    // If `tagGroupsToDisplay` instance parameter is set, filter for selected groups.
    let allTagsFilteredForGroups;

    if (tagGroupsToDisplay) {
      allTagsFilteredForGroups = allTags.items.filter((tag) =>
        tagGroupsToDisplay
          .split(",")
          .some((tagGroup) => tagGroup.trim() === getTagGroupName(tag))
      );
    }

    // Sort tags alphabetically.
    const allTagsSorted = sortArrayOfObjectsAlphabeticallyByKey({
      arr: allTagsFilteredForGroups ? allTagsFilteredForGroups : allTags.items,
      key: "name",
    });

    // Get all selected Tags, and merge data with `allTags`, which includes
    // additional metadata, such as Name, Public/Private, etc.
    const initialSelectedTags = sdk.entry.metadata.tags;
    const normalizedSelectedTags = allTagsSorted.filter((availableTagsItem) =>
      initialSelectedTags.some(
        (initialSelectedTagsItem) =>
          initialSelectedTagsItem.sys.id === availableTagsItem.sys.id
      )
    );

    // Remove any selected tags from the list of available tags so that they cannot be selected twice.
    const availableTagsFiltered = allTagsSorted.filter(
      (availableTag) =>
        !initialSelectedTags.some(
          (selectedTag) => selectedTag.sys.id === availableTag.sys.id
        )
    );

    // Update state.
    setAvailableTags(availableTagsFiltered);
    setSelectedTags(normalizedSelectedTags);
    setIsLoading(false);
  }, [sdk.cma.tag, sdk.entry.metadata.tags, tagGroupsToDisplay]);

  // Debounce / batch entry updates so that they can only fire once every couple of seconds,
  // otherwise we hit entry version errors when items are clicked quickly in rapid succession.
  // Uses React's useRef so that _.debounce isn't disrupted on re-render.
  if (debouncedUpdateEntry.current === null) {
    debouncedUpdateEntry.current = _.debounce(
      async (tagOperation, updatedTags) => {
        if (updatedTags.length > 0) {
          // Get current entry, add tag, and update (i.e. save) entry.
          const entry = await sdk.cma.entry.get({
            entryId: sdk.entry.getSys().id,
          });

          // Determine whether we're adding or removing tags and operate accordingly.
          if (tagOperation === "add") {
            entry.metadata.tags = [...entry.metadata.tags, ...updatedTags];
          }

          if (tagOperation === "remove") {
            entry.metadata.tags = entry.metadata.tags.filter(
              (tag) =>
                !updatedTags.some(
                  (updatedTag) => tag.sys.id === updatedTag.sys.id
                )
            );
          }

          // Update the entry and clear `updatedTags` for future use.
          sdk.cma.entry.update({ entryId: entry.sys.id }, entry);
          setUpdatedTags([]);
        }
      },
      1000
    );
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
    // when many tags are added in rapid succession.
    setTagOperation("add");
    setUpdatedTags((prevUpdatedTags) => [
      ...prevUpdatedTags,
      formatTagMetadataObject(selectedTag.sys.id),
    ]);
  };

  // When an item is removed, remove it from the list of selected tags and add back to dropdown.
  const handleRemoveItem = async ({ removedTag }) => {
    // Remove item from selected tags.
    const nextSelectedTags = selectedTags.filter(
      (tag) => tag.sys.id !== removedTag.sys.id
    );
    setSelectedTags(nextSelectedTags);

    // Add item to available tags and sort alphabetically.
    const nextAvailableTags = sortArrayOfObjectsAlphabeticallyByKey({
      arr: [...availableTags, removedTag],
      key: "name",
    });
    setAvailableTags(nextAvailableTags);

    // `updatedTags` are used to batch entry updates to prevent `versionMismatch` errors
    // when many tags are removed in rapid succession.
    setTagOperation("remove");
    setUpdatedTags((prevUpdatedTags) => [
      ...prevUpdatedTags,
      formatTagMetadataObject(removedTag.sys.id),
    ]);
  };

  // Automatically resize window based on element height, also accounting for absolute elements.
  useEffect(() => {
    sdk.window.startAutoResizer({ absoluteElements: true });
  }, [sdk.window]);

  // Get Tags on initial page load.
  useEffect(() => {
    getTags();
  }, [getTags]);

  useEffect(() => {
    // If selectedTags is empty, invalidate field to provide feedback to the user.
    if (selectedTags.length <= 0) {
      sdk.field.setValue(null);
    } else {
      sdk.field.setValue(true);
    }

    // Group Tags based on prefix so we can display in the same way as Tags tab.
    setGroupedSelectedTags(() => {
      const nextGroupedSelectedTags = [];

      selectedTags.forEach((selectedTag) => {
        const tagGroupName = getTagGroupName(selectedTag);

        // If the group doesn't exist, create an array for it.
        if (!nextGroupedSelectedTags[tagGroupName]) {
          nextGroupedSelectedTags[tagGroupName] = [];
        }

        // Push the item to the corresponding group.
        nextGroupedSelectedTags[tagGroupName].push(selectedTag);
      });

      return nextGroupedSelectedTags;
    });
  }, [sdk.field, selectedTags]);

  // `updatedTags` stores all added/removed tags in a batch that can be processed all at once, otherwise
  // we may run into `versionMismatch` errors because versions can't keep up with speed of clicks.
  useEffect(() => {
    debouncedUpdateEntry.current(tagOperation, updatedTags);
  }, [tagOperation, updatedTags]);

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
          </Form>
        )}
      </Box>

      {/* Display a heading + list for each Tag group  */}
      {Object.keys(groupedSelectedTags).map((tagGroupName) => {
        return (
          <>
            <h2
              key={`${tagGroupName}-heading`}
              style={{
                marginTop: tokens.spacingM,
                marginBottom: tokens.spacingXs,
              }}
            >
              {tagGroupName}
            </h2>
            <List
              key={`${tagGroupName}-list`}
              style={{ listStyle: "none", padding: 0 }}
            >
              {groupedSelectedTags[tagGroupName].map((selectedTag) => {
                return (
                  <List.Item
                    key={selectedTag.sys.id}
                    style={{ marginBottom: tokens.spacingXs }}
                  >
                    <Pill
                      isDraggable={false}
                      onClose={() =>
                        handleRemoveItem({ removedTag: selectedTag })
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
          </>
        );
      })}
    </Box>
  );
};

export default Field;
