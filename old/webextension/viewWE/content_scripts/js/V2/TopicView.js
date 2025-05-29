export default class TopicView {
  constructor(container) {
    this.shown = false;

    this.toolbar = container;
    this.enhanceButton = document.getElementById('wertiview-toolbar-enhance-button');
    this.activityMenu = document.querySelector('#wertiview-toolbar-activity-menu');
    this.indicator = document.createElement('label');
  }

  show() {
    this.shown = true;
    this.activityMenu.classList.add('hidden');
    this.enhanceButton.classList.add('hidden');

    this.toolbar.insertBefore(this.indicator, this.enhanceButton);
  }

  hide() {
    if (this.shown) {
      this.activityMenu.classList.remove('hidden');
      this.enhanceButton.classList.remove('hidden');
      this.indicator.parentNode.removeChild(this.indicator);
    }
    this.shown = false;
  }

  update(currently) {
    this.indicator.textContent = currently;
  }
}
