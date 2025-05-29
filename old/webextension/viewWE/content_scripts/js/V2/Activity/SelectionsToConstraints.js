const selectionItemsToConstraint = selectionItems => {
  const admissible = new Set();
  selectionItems.forEach(({ match, checked }) => {
    if (checked) {
      admissible.add(match);
    }
  });
  return admissible;
};

export default (selections) => {
  const constraints = {};
  selections.map(({ data, selectionItems }) => {
    const admissibleValues = selectionItemsToConstraint(selectionItems);
    constraints[`data-${data}`] = { match: admissibleValues };
  });
  return constraints;
};
