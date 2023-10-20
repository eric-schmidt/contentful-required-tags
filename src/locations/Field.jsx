import React, { useEffect, useState } from "react";
import { Autocomplete, Box } from "@contentful/f36-components";
import { useSDK } from "@contentful/react-apps-toolkit";

const Field = () => {
  // Init SDK.
  const sdk = useSDK();

  // Init state vars.
  const [isLoading, setIsLoading] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  // Get all available Tags from Contentful, as well as Tags that have already been selected.
  const getTags = async () => {
    setIsLoading(true);

    // Get all available Tags and sort alphabetically.
    // TODO: This could be filtered to a subset for different use cases (e.g. Regions for perms).
    const allTags = await sdk.cma.tag.getMany();
    const allTagsSorted = sortArrayOfObjectsAlphabeticallyByKey({
      arr: allTags.items,
      key: "name",
    });

    // Get all selected Tags, and normalize with available Tags (i.e. `allTags`), which also
    // includes additional metadata, such as Name, Public/Private, etc.
    const initialSelectedTags = sdk.entry.metadata.tags;
    console.log(initialSelectedTags);
    const normalizedSelectedTags = allTagsSorted.filter((allTagsItem) => {
      return initialSelectedTags.some(
        (initialSelectedTagsItem) =>
          initialSelectedTagsItem.sys.id === allTagsItem.sys.id
      );
    });

    // Update state.
    setAllTags(allTagsSorted);
    setSelectedTags(normalizedSelectedTags);
    setIsLoading(false);
  };

  // Utility function for sorting an array of objects based on the value of a nested key.
  const sortArrayOfObjectsAlphabeticallyByKey = ({ arr, key }) => {
    return arr.sort((a, b) => a[key].localeCompare(b[key]));
  };

  // When an item is selected, add it to the list of selected tags and remove item from dropdown.
  const handleSelectItem = (selectedItem) => {
    const nextSelectedTags = sortArrayOfObjectsAlphabeticallyByKey({
      arr: [...selectedTags, selectedItem],
      key: "name",
    });
    setSelectedTags(nextSelectedTags);

    // Update the actual Tag metadata within Contentful.
    sdk.entry.metadata.tags.push({
      sys: {
        type: "Link",
        linkType: "Tag",
        id: selectedItem.sys.id,
      },
    });
    // sdk.entry.publish(); TODO: Need to use .update, but we get null/undefined errors
    // sdk.cma.entry.update(sdk.entry.getSys().id);
    console.log(sdk.cma.entry);
  };

  // Automatically resize window based on element height.
  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk.window]);

  // Get Tags on initial page load.
  useEffect(() => {
    getTags();
  }, []);

  // When selected tags change, remove the item from "allTags" so that it cannot be selected multiple times.
  useEffect(() => {
    const nextAllTags = allTags.filter(
      (allTagsItem) =>
        !selectedTags.some(
          (selectedTagsItem) => allTagsItem.sys.id === selectedTagsItem.sys.id
        )
    );

    setAllTags(nextAllTags);
  }, [selectedTags]);

  return (
    <Box style={{ minHeight: "250px", padding: "3px" }}>
      <Autocomplete
        isLoading={isLoading}
        items={allTags}
        itemToString={(item) => item.sys.id}
        renderItem={(item) => item.name}
        onSelectItem={handleSelectItem}
        closeAfterSelect={false}
        isRequired={true}
        defaultValue="Search for tags"
        textOnAfterSelect="clear"
        listWidth="full"
      />
      <ul>
        {/* TODO: Add a loading state */}
        {selectedTags &&
          selectedTags.map((selectedTag) => {
            return <li key={selectedTag.sys.id}>{selectedTag.name}</li>;
          })}
      </ul>
    </Box>
  );
};

export default Field;
