const getActivityList = function(activities) {
  const options = [];

  Object.keys(activities).map((activityKey) => {
    options.push({
      value: activityKey,
      title: activities[activityKey].instruction.title
    });
  });

  return options;
};

const renderOption = ({ title, value }) => {
  const option = document.createElement('option');
  option.setAttribute('value', value);
  option.textContent = title;
  return option;
};

const renderSelect = (activityList) => {
  const selectElement = document.createElement('select');
  selectElement.setAttribute('id', 'activityV2-picker');
  selectElement.classList.add('wertiview-toolbar-menu');

  activityList.map(activity => {
    const option = renderOption(activity);
    selectElement.append(option);
  });

  return selectElement;
};

export default (activities, activity) => {
  const select = renderSelect(getActivityList(activities));

  if (activity) {
    select.value = activity;
  }

  return select;
}
