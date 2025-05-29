const renderSelectionItem = (item, selectionIndex, itemIndex) => {
  const id = `selection-${selectionIndex}-${itemIndex}`;
  const checked = item.checked ? 'checked' : '';

  // title
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = item.title;

  // input
  const input = document.createElement('input');
  input.setAttribute('type', 'checkbox');
  input.setAttribute('id', id);
  if (checked) {
    input.setAttribute('checked', true);
  }

  input.setAttribute('data-selection-index', selectionIndex);
  input.setAttribute('data-item-index', itemIndex);

  label.prepend(input);

  return label;
};

const renderSelection = (selection, selectionIndex) => {
  // container for items
  const container = document.createElement('div');
  container.classList.add('selectionContainer');
  container.innerHTML = `<h2>${selection.title}</h2>`;

  const selectionItems = selection.selectionItems.map(
    (selectionItem, index) => renderSelectionItem(selectionItem, selectionIndex, index)
  );
  selectionItems.map(selectionItem => container.append(selectionItem));

  return container;
};

const renderSelections = (selections) => {
  // container
  const container = document.createElement('div');
  container.setAttribute('id', 'selections-container');
  container.innerHTML = `<h1>Selections</h1>`;

  // add selections to container
  const renderedSelections = selections.map(
    (selection, index) => renderSelection(selection, index)
  );
  renderedSelections.map(renderedSelection => container.append(renderedSelection));

  return container;
};

export default (activityPicker, baseSelections) => {
  const container = renderSelections(baseSelections);
  container.append(activityPicker);
  return container;
};
