const $ = require('jquery');
require('jquery-ui/ui/widgets/dialog');
require('jquery-ui/themes/base/button.css');
require('jquery-ui/themes/base/core.css');
require('jquery-ui/themes/base/theme.css');
require('jquery-ui/themes/base/dialog.css');
const aboutDialogContent = require('../html/about.html');

module.exports = {
  /**
   * The extension send the message to open the about dialog.
   * Create it with "about.html" and insert the image "view-128.png".
   * Show the about dialog over the background page.
   */
  open: function() {
    if (!$("#view-about").length) {
      // create image element with the view icon
      const viewLogo = require('../../icons/view-128.png');
      const $viewImg = $("<img>");
      $viewImg.attr("src", viewLogo);

      // get the website's dimensions
      const wHeight = $(window).height();
      const dHeight = wHeight * 0.8;

      // create and open the about dialog
      const $aboutDialog = $(aboutDialogContent);

      $aboutDialog.find("#view-icon").append($viewImg);

      // create the about dialog
      $aboutDialog.dialog({
        modal: true,
        title: "About VIEW",
        overlay: {opacity: 0.1, background: "black"},
        width: "auto",
        height: dHeight,
        draggable: true,
        resizable: true
      });

      $aboutDialog.on("dialogclose", function() {
        // remove the about dialog so that it can be loaded properly next time
        $aboutDialog.remove();
      });
    }
  }
};
