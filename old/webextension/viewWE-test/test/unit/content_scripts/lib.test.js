/**
 * Tests for the lib.js file of the VIEW add-on.
 *
 * Created by eduard on 10.04.17.
 */

"use strict";

import $ from 'jquery';
import view from '../../../../viewWE/content_scripts/js/view.js';

describe("lib.js", function() {
  let sandbox;

  before(function() {
    const $ScrollArea = $("<div id='scroll-area'>");
    $ScrollArea.css("height", 50);
    $ScrollArea.css("overflow", "auto");

    $ScrollArea.append($("<div id='1' class='element'>Some element</div>"));
    $ScrollArea.append($("<div id='2' class='element'>Some element</div>"));
    $ScrollArea.append($("<div id='3' class='element'>Some element</div>"));

    $("body").append($ScrollArea);

    $(".element").css("height", 30);
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
    $("#view-dialog").remove();
    $("#view-feedback-dialog").remove();
    $(window).off("click");
    $("a").remove();
    $("#scroll-area").scrollTop(0);
    $(".element").show();
  });

  describe("initOnWindowClick", function() {
    it("should initialize on window click handler", function() {
      const selectorSpy = sandbox.spy($.fn, "init");
      const eventSpy = sandbox.spy($.fn, "on");

      view.lib.initOnWindowClick();

      sinon.assert.calledOnce(selectorSpy);
      sinon.assert.calledWith(selectorSpy, window);

      sinon.assert.calledOnce(eventSpy);
      sinon.assert.calledWith(eventSpy, "click");
    });

    it("should call VIEWmenu.hide() on click, because the target was not the view menu button", function() {
      const viewMenuHideSpy = sandbox.spy(view.VIEWmenu, "hide");

      view.lib.initOnWindowClick();

      $(window).trigger("click");

      sinon.assert.calledOnce(viewMenuHideSpy);
    });

    it("should not call VIEWmenu.hide() on click, because the target was the view menu button", function() {
      const viewMenuHideSpy = sandbox.spy(view.VIEWmenu, "hide");
      const viewMenuButtonId = "wertiview-VIEW-menu";

      $("body").append("<div>").attr("id", viewMenuButtonId);

      view.lib.initOnWindowClick();

      $("#" + viewMenuButtonId).trigger("click");

      sinon.assert.notCalled(viewMenuHideSpy);
    });

    it("should call accountMenu.hide() on click, because the target was not the account menu button", function() {
      const accountMenuHideSpy = sandbox.spy(view.accountMenu, "hide");

      view.lib.initOnWindowClick();

      $(window).trigger("click");

      sinon.assert.calledOnce(accountMenuHideSpy);
    });

    it("should not call statisticsMenu.hide() on click, because the target was the account menu button", function() {
      const accountMenuHideSpy = sandbox.spy(view.accountMenu, "hide");
      const accountMenuButtonIdSelector = view.toolbar.selectorStart + "account-menu-button";

      $("body").append("<div>").attr("id", accountMenuButtonIdSelector.substring(1));

      view.lib.initOnWindowClick();

      $(accountMenuButtonIdSelector).trigger("click");

      sinon.assert.notCalled(accountMenuHideSpy);
    });

    it("should call statisticsMenu.hide() on click, because the target was not the statistics button", function() {
      const statisticsMenuHideSpy = sandbox.spy(view.statisticsMenu, "hide");

      view.lib.initOnWindowClick();

      $(window).trigger("click");

      sinon.assert.calledOnce(statisticsMenuHideSpy);
    });

    it("should not call statisticsMenu.hide() on click, because the target was the statistics button", function() {
      const statisticsMenuHideSpy = sandbox.spy(view.statisticsMenu, "hide");
      const staisticsButtonIdSelector = view.accountMenu.selectorStart + "statistics";

      $("body").append("<div>").attr("id", staisticsButtonIdSelector.substr(1));

      view.lib.initOnWindowClick();

      $(staisticsButtonIdSelector).trigger("click");

      sinon.assert.notCalled(statisticsMenuHideSpy);
    });

    it("should call lib.removeDialog($Dialog) on click, as the dialog was not clicked", function() {
      const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

      view.lib.initOnWindowClick();

      const $Dialog = $("<div id='view-feedback-dialog'>");
      const $Body = $("body");

      $Dialog.wrap($("<div>"));

      $Body.append($Dialog.parent());

      $Body.trigger("click");

      sinon.assert.calledOnce(removeDialogSpy);
    });

    it("should not call lib.removeDialog($Dialog) on click, as the dialog was clicked", function() {
      const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

      view.lib.initOnWindowClick();

      const $Dialog = $("<div id='view-feedback-dialog'>");

      $("body").append($Dialog);

      $Dialog.trigger("click");

      sinon.assert.notCalled(removeDialogSpy);
    });
  });

  describe("createButton", function() {
    it("should return a button element with the expected values", function() {
      const createButtonSpy = sandbox.spy(view.lib, "createButton");

      const id = "id";
      const aClass = "class";
      const text = "text";

      const $Button = $("<button>");
      $Button.attr("id", id);
      $Button.addClass(aClass);
      $Button.text(text);

      view.lib.createButton(id, aClass, text);

      expect(createButtonSpy.firstCall.returnValue).to.eql($Button);
    });
  });

  describe("createList", function() {
    it("should return list element with the expected values", function() {
      const createListSpy = sandbox.spy(view.lib, "createList");

      const allItems = [
        "firstItem",
        "secondItem"
      ];
      const id = "id";

      const $List = $("<ul>");
      $List.attr("id", id);

      $.each(allItems, function(index) {
        $List.append($("<li>").text(allItems[index]));
      });

      view.lib.createList(id, allItems);

      expect(createListSpy.firstCall.returnValue).to.eql($List);
    });
  });

  describe("addItems", function() {
    it("should add all items to a given list element", function() {
      const allItems = [
        "<i>firstItem</i>",
        "secondItem"
      ];

      const $List = $("<ul>");

      view.lib.addItems($List, allItems);

      expect($List.find("li:eq(0)").html()).to.equal("<i>firstItem</i>");
      expect($List.find("li:eq(1)").html()).to.equal("secondItem");
    });
  });

  describe("dialogSetup", function() {
    it("should call dialogSetup($Dialog, settings), with max width in settings", function() {
      const dialogSpy = sandbox.spy($.fn, "dialog");

      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      const maxWidth = 500;

      const settings = {
        width: "auto",
        maxWidth: maxWidth
      };

      view.lib.dialogSetup($Dialog, settings);

      sinon.assert.calledOnce(dialogSpy.withArgs(settings));

      expect($Dialog.dialog("widget").css("max-width")).to.equal(maxWidth + "px")
    });

    it("should call dialogSetup($Dialog, settings), without max width in settings", function() {
      const dialogSpy = sandbox.spy($.fn, "dialog");

      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      const settings = {
        title: "some title"
      };

      view.lib.dialogSetup($Dialog, settings);

      sinon.assert.calledOnce(dialogSpy.withArgs(settings));
    });

    it("should call removeDialog($Dialog) when the 'Ok' button was pressed", function() {
      const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      const settings = {
        width: "auto",
        maxWidth: $(window).width() * 0.5,
        buttons: {
          Ok: function() {
            view.lib.removeDialog($("#view-dialog"));
          }
        }
      };

      view.lib.dialogSetup($Dialog, settings);

      // trigger a click on the 'Ok' button
      $Dialog.dialog("option", "buttons").Ok();

      sinon.assert.calledOnce(removeDialogSpy);
      sinon.assert.calledWith(removeDialogSpy, $Dialog);
    });

    it("should remove the dialog", function() {
      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      $("body").append($Dialog);

      expect($("#view-dialog").length).to.be.above(0);

      view.lib.removeDialog($Dialog);

      expect($("#view-dialog").length).to.equal(0);
    });
  });

  describe("initDialogClose", function() {
    it("should init the dialog with a dialogclose handler", function() {
      const eventSpy = sandbox.spy($.fn, "on");

      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      view.lib.initDialogClose($Dialog);

      sinon.assert.calledOnce(eventSpy);
      sinon.assert.calledWith(eventSpy, "dialogclose");
    });

    it("should call removeDialog($Dialog) on dialogclose", function() {
      const removeDialogSpy = sandbox.spy(view.lib, "removeDialog");

      const $Dialog = $("<div>");
      $Dialog.attr("id", "view-dialog");

      view.lib.initDialogClose($Dialog);

      $Dialog.trigger("dialogclose");

      sinon.assert.calledOnce(removeDialogSpy);
      sinon.assert.calledWith(removeDialogSpy, $Dialog);
    });
  });

  describe("disableAnchors", function() {
    it("should have removed the 'href' attribute from all anchor elements", function() {
      const href1 = "http://www.test.html";
      const href2 = "http://www.test2.html";
      const $Body = $("body");

      $Body.append("<a href='" + href1 + "'>");
      $Body.append("<a href='" + href2 + "'>");
      view.lib.disableAnchors();

      expect($("a[href]").length).to.equal(0);
    });
  });

  describe("shuffleList", function() {
    it("should rearrange an array", function() {
      const allItems = [
        "firstItem",
        "secondItem",
        "thirdItem",
        "fourthItem"
      ];

      // make randomness predictable
      sinon.stub(Math, "random").callsFake(function(){
        return 0.5;
      });

      view.lib.shuffleList(allItems);

      expect(allItems).to.eql([
        "firstItem",
        "fourthItem",
        "secondItem",
        "thirdItem"
      ]);
    });
  });

  describe("detectCapitalization", function() {
    it("should return 1, as everything is in upper case", function() {
      const detectCapitalizationSpy = sandbox.spy(view.lib, "detectCapitalization");

      view.lib.detectCapitalization("TEST");

      expect(detectCapitalizationSpy.firstCall.returnValue).to.equal(1);
    });

    it("should return 2, as the first letter is in upper case", function() {
      const detectCapitalizationSpy = sandbox.spy(view.lib, "detectCapitalization");

      view.lib.detectCapitalization("Test");

      expect(detectCapitalizationSpy.firstCall.returnValue).to.equal(2);
    });

    it("should return 0, as everything is in lower case", function() {
      const detectCapitalizationSpy = sandbox.spy(view.lib, "detectCapitalization");

      view.lib.detectCapitalization("test");

      expect(detectCapitalizationSpy.firstCall.returnValue).to.equal(0);
    });
  });

  describe("matchCapitalization", function() {
    it("should return the word unchanged, as the captype is 0", function() {
      const matchCapitalizationSpy = sandbox.spy(view.lib, "matchCapitalization");

      const word = "test";

      view.lib.matchCapitalization(word, 0);

      expect(matchCapitalizationSpy.firstCall.returnValue).to.equal(word);
    });

    it("should return the word completely in upper case, as the captype is 1", function() {
      const matchCapitalizationSpy = sandbox.spy(view.lib, "matchCapitalization");

      const word = "test";

      view.lib.matchCapitalization(word, 1);

      expect(matchCapitalizationSpy.firstCall.returnValue).to.equal("TEST");
    });

    it("should return the word with the first letter in upper case, as the captype is 2", function() {
      const matchCapitalizationSpy = sandbox.spy(view.lib, "matchCapitalization");

      const word = "test";

      view.lib.matchCapitalization(word, 2);

      expect(matchCapitalizationSpy.firstCall.returnValue).to.equal("Test");
    });

    it("should return the word unchanged, as the captype is 4 (default case triggered)", function() {
      const matchCapitalizationSpy = sandbox.spy(view.lib, "matchCapitalization");

      const word = "test";

      view.lib.matchCapitalization(word, 4);

      expect(matchCapitalizationSpy.firstCall.returnValue).to.equal(word);
    });
  });

  describe("toggleAndScrollToElement", function() {
    it("should toggle the element", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#3");

      $Element.hide();

      view.lib.toggleAndScrollToElement($Element, $ScrollArea);

      expect($Element.css("display")).to.equal("block");

      view.lib.toggleAndScrollToElement($Element, $ScrollArea);

      expect($Element.css("display")).to.equal("none");
    });

    it("should call view.lib.scrollToElement($Element, $ScrollArea)", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#3");

      const scrollToElementSpy = sandbox.spy(view.lib, "scrollToElement");

      view.lib.toggleAndScrollToElement($Element, $ScrollArea);

      sinon.assert.calledOnce(scrollToElementSpy);
      sinon.assert.calledWithExactly(scrollToElementSpy,
        $Element,
        $ScrollArea
      );
    });
  });

  describe("scrollToElement", function() {
    it("should scroll to the element inside the scroll area, scroll bar at top", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#3");

      $ScrollArea.scrollTop(0);

      const scrollTopSpy = sandbox.spy($.fn, "scrollTop");

      view.lib.scrollToElement($Element, $ScrollArea);

      sinon.assert.called(scrollTopSpy);
      sinon.assert.calledWithExactly(scrollTopSpy,
        60
      );
    });

    it("should scroll to the element inside the scroll area, scroll bar at #2", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#3");

      $ScrollArea.scrollTop(30);

      const scrollTopSpy = sandbox.spy($.fn, "scrollTop");

      view.lib.scrollToElement($Element, $ScrollArea);

      sinon.assert.called(scrollTopSpy);
      sinon.assert.calledWithExactly(scrollTopSpy,
        60
      );
    });

    it("should scroll to the element inside the scroll area, scroll bar at element", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#2");

      $ScrollArea.scrollTop(30);

      const scrollTopSpy = sandbox.spy($.fn, "scrollTop");

      view.lib.scrollToElement($Element, $ScrollArea);

      sinon.assert.called(scrollTopSpy);
      sinon.assert.calledWithExactly(scrollTopSpy,
        30
      );
    });

    it("should not scroll to a hidden element inside the scroll area", function() {
      const $ScrollArea = $("#scroll-area");
      const $Element = $("#3");

      $ScrollArea.scrollTop(0);

      $Element.hide();

      const scrollTopSpy = sandbox.spy($.fn, "scrollTop");

      view.lib.scrollToElement($Element, $ScrollArea);

      sinon.assert.notCalled(scrollTopSpy);
    });
  });

  describe("moveDialog", function() {
    it("should call $.fn.dialog('option', 'position', position)", function() {
      const $Dialog = $("<div>").attr("id", "view-feedback-dialog");

      $("body").append($Dialog);

      view.lib.dialogSetup($Dialog, {});

      const position = {
        my: "top",
        at: "top",
        of: window
      };

      const dialogSpy = sandbox.spy($.fn, "dialog");

      view.lib.moveDialog($Dialog, position);

      sinon.assert.calledOnce(dialogSpy);
      sinon.assert.calledWithExactly(dialogSpy,
        "option",
        "position",
        position
      );
    });
  });

  describe("getAndUpdateOriginalContent", function() {
    it("should store the innerHTML of the content div into" +
      " view.originalContent", function() {
      const $Content = $("<div id='wertiview-content'>");

      $Content.html("<span>some content</span>");

      $("body").append($Content);

      const originalContent = view.lib.getAndUpdateOriginalContent();

      expect(originalContent.innerHTML).to.equal(view.originalContent);

      $Content.remove();
    });
  });

  describe("createContentElement", function() {
    const contentInnerHTML = "<div>some content</div>";

    const contentElement = view.lib.createContentElement(contentInnerHTML);

    it("should be a div element", function() {
      expect(contentElement.nodeName).to.equal("DIV");
    });

    it("should be an element with the expected id", function() {
      expect(contentElement.id).to.equal("wertiview-content");
    });

    it("should be an element with the same innerHTML passed as parameter", function() {
      expect(contentElement.innerHTML).to.equal(contentInnerHTML);
    });

    $(contentElement).remove();
  });
});
