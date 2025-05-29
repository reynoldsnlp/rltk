const $ = require('jquery');

module.exports = function(view) {
  return {
    /**
     * Russian: Create a Paradigm Table for Assistive Reading
     */
    createRusParadigmTable: function($EnhancementElement) {
      $(".view-assistive-reading-paradigm-item").remove();
      $(".view-assistive-reading-paradigm-container").remove();

      if($EnhancementElement.data("paradigms") == null) {
        return;
      }

      const twoTagDict = {
        "+Msc+AnIn+Nom": ["+Msc","+AnIn","+Nom"], "+Msc+AnIn+Acc": ["+Msc","+AnIn","+Acc"], "+Msc+Anim+Acc": ["+Msc","+Anim","+Acc"],
        "+Msc+Inan+Acc": ["+Msc","+Inan","+Acc"], "+Msc+AnIn+Gen": ["+Msc","+AnIn","+Gen"], "+Msc+AnIn+Loc": ["+Msc","+AnIn","+Loc"],
        "+Msc+AnIn+Dat": ["+Msc","+AnIn","+Dat"], "+Msc+AnIn+Ins": ["+Msc","+AnIn","+Ins"], "+Neu+AnIn+Nom": ["+Neu","+AnIn","+Nom"],
        "+Neu+AnIn+Acc": ["+Neu","+AnIn","+Acc"], "+Neu+Anim+Acc": ["+Neu","+Anim","+Acc"], "+Neu+Inan+Acc": ["+Neu","+Inan","+Acc"],
        "+Neu+AnIn+Gen": ["+Neu","+AnIn","+Gen"], "+Neu+AnIn+Loc": ["+Neu","+AnIn","+Loc"], "+Neu+AnIn+Dat": ["+Neu","+AnIn","+Dat"],
        "+Neu+AnIn+Ins": ["+Neu","+AnIn","+Ins"], "+Fem+AnIn+Nom": ["+Fem","+AnIn","+Nom"], "+Fem+AnIn+Acc": ["+Fem","+AnIn","+Acc"],
        "+Fem+Anim+Acc": ["+Fem","+Anim","+Acc"], "+Fem+Inan+Acc": ["+Fem","+Inan","+Acc"], "+Fem+AnIn+Gen": ["+Fem","+AnIn","+Gen"],
        "+Fem+AnIn+Loc": ["+Fem","+AnIn","+Loc"], "+Fem+AnIn+Dat": ["+Fem","+AnIn","+Dat"], "+Fem+AnIn+Ins": ["+Fem","+AnIn","+Ins"],
        "+MFN+AnIn+Gen": ["+MFN","+AnIn","+Gen"], "+MFN+AnIn+Loc": ["+MFN","+AnIn","+Loc"], "+MFN+AnIn+Dat": ["+MFN","+AnIn","+Dat"],
        "+MFN+AnIn+Ins": ["+MFN","+AnIn","+Ins"]
      };
      const numberTagDict = {
        "+Nom": ["+MFN","+AnIn","+Nom"], "+Msc+Anim+Acc": ["+Msc","+Anim","+Acc"], "+Msc+Inan+Acc": ["+Msc","+Inan","+Acc"],
        "+Acc": ["+MFN","+AnIn","+Acc"], "+Gen": ["+MFN","+AnIn","+Gen"], "+Loc": ["+MFN","+AnIn","+Loc"],
        "+Dat": ["+MFN","+AnIn","+Dat"], "+Ins": ["+MFN","+AnIn","+Ins"], "+Ins+Leng": ["+MFN","+AnIn","+Loc","+Leng"]
      };
      const nounTagDict = {
        "+Sg+Nom": ["+Sg","+Nom"], "+Sg+Acc": ["+Sg","+Acc"], "+Sg+Gen": ["+Sg","+Gen"],
        "+Sg+Gen2": ["+Sg","+Gen2"], "+Sg+Loc": ["+Sg","+Loc"], "+Sg+Loc2": ["+Sg","+Loc2"],
        "+Sg+Dat": ["+Sg","+Dat"], "+Sg+Ins": ["+Sg","+Ins"], "+Sg+Voc": ["+Sg","+Voc"],
        "+Pl+Nom": ["+Pl","+Nom"], "+Pl+Acc": ["+Pl","+Acc"], "+Pl+Gen": ["+Pl","+Gen"],
        "+Pl+Gen2": ["+Pl","+Gen2"], "+Pl+Loc": ["+Pl","+Loc"], "+Pl+Loc2": ["+Pl","+Loc2"],
        "+Pl+Dat": ["+Pl","+Dat"], "+Pl+Ins": ["+Pl","+Ins"], "+Pl+Voc": ["+Pl","+Voc"]
      };
      const adjectiveTagDict = {
        "+Fem+AnIn+Sg+Nom": ["+Fem","+AnIn","+Sg","+Nom"], "+Fem+AnIn+Sg+Acc": ["+Fem","+AnIn","+Sg","+Acc"],
        "+Fem+Anim+Sg+Acc": ["+Fem","+Anim","+Sg","+Acc"], "+Fem+Inan+Sg+Acc": ["+Fem","+Inan","+Sg","+Acc"],
        "+Fem+AnIn+Sg+Gen": ["+Fem","+AnIn","+Sg","+Gen"], "+Fem+AnIn+Sg+Loc": ["+Fem","+AnIn","+Sg","+Loc"],
        "+Fem+AnIn+Sg+Dat": ["+Fem","+AnIn","+Sg","+Dat"], "+Fem+AnIn+Sg+Ins": ["+Fem","+AnIn","+Sg","+Ins"],
        "+Fem+AnIn+Sg+Ins+Leng": ["+Fem","+AnIn","+Sg","+Ins","+Leng"], "+Fem+Sg+Pred": ["+Fem","+Sg","+Pred"],
        "+Msc+AnIn+Sg+Nom": ["+Msc","+AnIn","+Sg","+Nom"], "+Msc+AnIn+Sg+Acc": ["+Msc","+AnIn","+Sg","+Acc"],
        "+Msc+Anim+Sg+Acc": ["+Msc","+Anim","+Sg","+Acc"], "+Msc+Inan+Sg+Acc": ["+Msc","+Inan","+Sg","+Acc"],
        "+Msc+AnIn+Sg+Gen": ["+Msc","+AnIn","+Sg","+Gen"], "+Msc+AnIn+Sg+Loc": ["+Msc","+AnIn","+Sg","+Loc"],
        "+Msc+AnIn+Sg+Dat": ["+Msc","+AnIn","+Sg","+Dat"], "+Msc+AnIn+Sg+Ins": ["+Msc","+AnIn","+Sg","+Ins"],
        "+Msc+AnIn+Sg+Ins+Leng": ["+Msc","+AnIn","+Sg","+Ins","+Leng"], "+Msc+Sg+Pred": ["+Msc","+Sg","+Pred"],
        "+Neu+AnIn+Sg+Nom": ["+Neu","+AnIn","+Sg","+Nom"], "+Neu+AnIn+Sg+Acc": ["+Neu","+AnIn","+Sg","+Acc"],
        "+Neu+Anim+Sg+Acc": ["+Neu","+Anim","+Sg","+Acc"], "+Neu+Inan+Sg+Acc": ["+Neu","+Inan","+Sg","+Acc"],
        "+Neu+AnIn+Sg+Gen": ["+Neu","+AnIn","+Sg","+Gen"], "+Neu+AnIn+Sg+Loc": ["+Neu","+AnIn","+Sg","+Loc"],
        "+Neu+AnIn+Sg+Dat": ["+Neu","+AnIn","+Sg","+Dat"], "+Neu+AnIn+Sg+Ins": ["+Neu","+AnIn","+Sg","+Ins"],
        "+Neu+AnIn+Sg+Ins+Leng": ["+Neu","+AnIn","+Sg","+Ins","+Leng"], "+Neu+Sg+Pred": ["+Neu","+Sg","+Pred"],
        "+MFN+AnIn+Pl+Nom": ["+MFN","+AnIn","+Pl","+Nom"], "+MFN+AnIn+Pl+Acc": ["+MFN","+AnIn","+Pl","+Acc"],
        "+MFN+Anim+Pl+Acc": ["+MFN","+Anim","+Pl","+Acc"], "+MFN+Inan+Pl+Acc": ["+MFN","+Inan","+Pl","+Acc"],
        "+MFN+AnIn+Pl+Gen": ["+MFN","+AnIn","+Pl","+Gen"], "+MFN+AnIn+Pl+Loc": ["+MFN","+AnIn","+Pl","+Loc"],
        "+MFN+AnIn+Pl+Dat": ["+MFN","+AnIn","+Pl","+Dat"], "+MFN+AnIn+Pl+Ins": ["+MFN","+AnIn","+Pl","+Ins"],
        "+MFN+AnIn+Pl+Ins+Leng": ["+MFN","+AnIn","+Pl","+Ins","+Leng"], "+MFN+Pl+Pred": ["+MFN+","Pl","+Pred"],
        "+Cmpar+Pred": ["+Cmpar","+Pred"]
      };
      const verbTagDict = {
        "+Prs+Sg1": ["+Prs+","+Sg1"], "+Prs+Sg2": ["+Prs+","+Sg2"], "+Prs+Sg3": ["+Prs+","+Sg3"],
        "+Prs+Pl1": ["+Prs+","+Pl1"], "+Prs+Pl2": ["+Prs+","+Pl2"], "+Prs+Pl3": ["+Prs+","+Pl3"],
        "+Fut+Sg1": ["+Fut+","+Sg1"], "+Fut+Sg2": ["+Fut+","+Sg2"], "+Fut+Sg3": ["+Fut+","+Sg3"],
        "+Fut+Pl1": ["+Fut+","+Pl1"], "+Fut+Pl2": ["+Fut+","+Pl2"], "+Fut+Pl3": ["+Fut+","+Pl3"],
        "+Pst+Msc+Sg": ["+Pst+","+Msc","+Sg"], "+Pst+Neu+Sg": ["+Pst+","+Neu","+Sg"],
        "+Pst+Fem+Sg": ["+Pst+","+Fem","+Sg"], "+Pst+MFN+Pl": ["+Pst+","+MFN","+Pl"],
        "+Imp+Sg2": ["+Imp","+Sg2"], "+Imp+Pl2": ["+Imp","+Pl2"], "+Inf": ["+Inf"],
        "+PrsAct+Adv": ["+PrsAct","+Adv"], "+PstAct+Adv": ["+PstAct","+Adv"],
        "+PrsAct+Msc+AnIn+Sg+Nom": ["+PrsAct","+Msc","+AnIn","+Sg","+Nom"], "+PrsPss+Msc+AnIn+Sg+Nom": ["+PrsPss","+Msc","+AnIn","+Sg","+Nom"],
        "+PstAct+Msc+AnIn+Sg+Nom": ["+PstAct","+Msc","+AnIn","+Sg","+Nom"], "+PstPss+Msc+AnIn+Sg+Nom": ["+PstPss","+Msc","+AnIn","+Sg","+Nom"]
      };

      // Create paradigm dictionaries (tag,word)
      const paradigmDictList = [];
      const paradigmStringList = $EnhancementElement.data("paradigms").split("ñôŃßĘńŠēPARADIGMEND,");
      paradigmStringList.forEach(function(paradigmString) {
        if(paradigmString == "") return;
        const paradigmDict = {};
        //paradigmString.replace("ñôŃßĘńŠēNEWPARADIGM,", "");
        const paradigmPairs = paradigmString.split(",");
        paradigmPairs.forEach(function(paradigmPair) {
          const pair = paradigmPair.split(":");
          if(pair[1] == null) pair[1] = "";
          var tagDict = {};
          if(pair[0].includes("+N+")) {
            tagDict = nounTagDict;
            paradigmDict["pos"] = "N";
          }
          // Ordinal numbers come before cardinal numbers
          else if(pair[0].includes("+Ord+")) {
            tagDict = adjectiveTagDict;
            paradigmDict["pos"] = "Ord";
          }
          else if(pair[0].includes("+Num+")) {
            if(pair[0].includes("один")) {
              tagDict = adjectiveTagDict;
              paradigmDict["pos"] = "один";
            }
            else if(pair[0].includes("два") || pair[0].includes("оба") || pair[0].includes("полтора")) {
              tagDict = twoTagDict;
              paradigmDict["pos"] = "Num";
            }
            else {
              tagDict = numberTagDict;
              paradigmDict["pos"] = "Num";
            }
          }
          // Adjectives come before verbs because it catches things
          // that look like: +V+Perf+TV+Der+Der/PstPss+A+Neu+AnIn+Sg+Nom
          else if(pair[0].includes("+A+")) {
            tagDict = adjectiveTagDict;
            paradigmDict["pos"] = "A";
          }
          else if(pair[0].includes("+V+")) {
            tagDict = verbTagDict;
            paradigmDict["pos"] = "V";
            if(pair[0].includes("+Impf+")) {
              paradigmDict["aspect"] = "Impf";
            }
            else if(pair[0].includes("+Perf+")) {
              paradigmDict["aspect"] = "Perf";
            }
          }

          for(var key in tagDict) {
            const tags = tagDict[key];
            var tagsInPair = true;
            for(var tag of tags) {
              if(!pair[0].includes(tag) ||
                   (tag == "+Gen" && pair[0].includes("+Gen2")) ||
                   (tag == "+Loc" && pair[0].includes("+Loc2")) ||
                   (tag == "+Ins" && !tags.includes("+Leng") && pair[0].includes("+Leng"))) {
                tagsInPair = false;
              }
            }
            if(tagsInPair) {
              paradigmDict[key] = pair[1];
              if(pair[1] == '') {
                paradigmDict[key] = null;
              }
            }
          }
        });

        paradigmDictList.push(paradigmDict);
      });

      // Create Paradigm Tables
      paradigmDictList.forEach(function(paradigmDict) {
        const $ParadigmContainer = $("<div>");
        $ParadigmContainer.addClass("view-assistive-reading-paradigm-container");
        const $ParadigmTitle = $("<div>");
        $ParadigmTitle.addClass("view-assistive-reading-paradigm-title");

        $ParadigmContainer.append($ParadigmTitle);
        $("#view-assistive-reading-description").append($ParadigmContainer);

        if(paradigmDict["pos"] == "N") {
          $ParadigmTitle.text("Noun Paradigm");

          const $ParadigmTable = $("<table>");
          $ParadigmTable.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable.append('<tr><th>Case</th><th>Singular</th><th>Plural</th></tr>');
          $ParadigmTable.append('<tr><td>Nom</td><td>' + (paradigmDict['+Sg+Nom'] || '–') + '</td><td>' + (paradigmDict['+Pl+Nom'] || '–') + '</td></tr>');
          $ParadigmTable.append('<tr><td>Acc</td><td>' + (paradigmDict['+Sg+Acc'] || '–') + '</td><td>' + (paradigmDict['+Pl+Acc'] || '–') + '</td></tr>');

          var genSg = paradigmDict['+Sg+Gen'];
          var gen2Sg = paradigmDict['+Sg+Gen2'];
          if(genSg == null && gen2Sg == null) {
            genSg = '–';
          } else if(genSg == null) {
            genSg = gen2Sg;
          } else if(genSg != null && gen2Sg != null){
            genSg = genSg + '/<br/>' + gen2Sg;
          }

          var genPl = paradigmDict['+Pl+Gen'];
          var gen2Pl = paradigmDict['+Pl+Gen2'];
          if(genPl == null && gen2Pl == null) {
            genPl = '–';
          } else if(genPl == null) {
            genPl = gen2Pl;
          } else if(genPl != null && gen2Pl != null) {
            genPl = genPl + '/<br/>' + gen2Pl;
          }

          $ParadigmTable.append('<tr><td>Gen</td><td>' + genSg + '</td><td>' + genPl + '</td></tr>');

          var locSg = paradigmDict['+Sg+Loc'];
          var loc2Sg = paradigmDict['+Sg+Loc2'];
          if(locSg == null && loc2Sg == null) {
            locSg = '–';
          } else if(locSg == null) {
            locSg = loc2Sg;
          } else if(locSg != null && loc2Sg != null){
            locSg = locSg + '/<br/>' + loc2Sg;
          }

          var locPl = paradigmDict['+Pl+Loc'];
          var loc2Pl = paradigmDict['+Pl+Loc2'];
          if(locPl == null && loc2Pl == null) {
            locPl = '–';
          } else if(locPl == null) {
            locPl = loc2Pl;
          } else if(locPl != null && loc2Pl != null) {
            locPl = locPl + '/<br/>' + loc2Pl;
          }

          $ParadigmTable.append('<tr><td>Prep</td><td>' + locSg + '</td><td>' + locPl + '</td></tr>');
          $ParadigmTable.append('<tr><td>Dat</td><td>' + (paradigmDict['+Sg+Dat'] || '–') + '</td><td>' + (paradigmDict['+Pl+Dat'] || '–') + '</td></tr>');
          $ParadigmTable.append('<tr><td>Ins</td><td>' + (paradigmDict['+Sg+Ins'] || '–') + '</td><td>' + (paradigmDict['+Pl+Ins'] || '–') + '</td></tr>');
          if(paradigmDict['+Sg+Voc'] != null || paradigmDict['+Pl+Voc'] != null) {
            $ParadigmTable.append('<tr><td>Voc</td><td>' + (paradigmDict['+Sg+Voc'] || '–') + '</td><td>' + (paradigmDict['+Pl+Voc'] || '–') + '</td></tr>');
          }
          $ParadigmContainer.append($ParadigmTable);
        }
        else if(paradigmDict["pos"] == "A" || paradigmDict["pos"] == "Ord" || paradigmDict["pos"] == "один") {
          if(paradigmDict["pos"] == "A") {
            $ParadigmTitle.text("Adjective Paradigm");
          }
          else if(paradigmDict["pos"] == "Ord") {
            $ParadigmTitle.text("Ordinal Paradigm");
          }
          else if(paradigmDict["pos"] == "один") {
            $ParadigmTitle.text("Number Paradigm");
          }

          const $ParadigmTable1 = $("<table>");
          $ParadigmTable1.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable1.append('<tr><th>Case</th><th>Masculine</th><th>Neuter</th></tr>');
          $ParadigmTable1.append('<tr><td>Nom</td><td>' + (paradigmDict['+Msc+AnIn+Sg+Nom'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Sg+Nom'] || '–') + '</td></tr>');

          var accMsc = paradigmDict['+Msc+AnIn+Sg+Acc'];
          var accMscInan = paradigmDict['+Msc+Inan+Sg+Acc'];
          var accMscAnim = paradigmDict['+Msc+Anim+Sg+Acc'];
          if(accMsc == null) {
            if(accMscInan != null && accMscAnim != null) {
              accMsc = accMscInan + '/<br/>' + accMscAnim;
            }
            else if(accMscInan == null && accMscAnim == null) {
              accMsc = '–';
            }
            else {
              accMsc = (accMscInan || '') + (accMscAnim || '');
            }
          }

          var accNeu = paradigmDict['+Neu+AnIn+Sg+Acc'];
          var accNeuInan = paradigmDict['+Neu+Inan+Sg+Acc'];
          var accNeuAnim = paradigmDict['+Neu+Anim+Sg+Acc'];
          if(accNeu == null) {
            if(accNeuInan != null && accNeuAnim != null) {
              accNeu = accNeuInan + '/<br/>' + accNeuAnim;
            }
            else if(accNeuInan == null && accNeuAnim == null) {
              accNeu = '–';
            }
            else {
              accNeu = (accNeuInan || '') + (accNeuAnim || '');
            }
          }

          $ParadigmTable1.append('<tr><td>Acc</td><td>' + accMsc + '</td><td>' + accNeu + '</td></tr>');
          $ParadigmTable1.append('<tr><td>Gen</td><td>' + (paradigmDict['+Msc+AnIn+Sg+Gen'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Sg+Gen'] || '–') + '</td></tr>');
          $ParadigmTable1.append('<tr><td>Prep</td><td>' + (paradigmDict['+Msc+AnIn+Sg+Loc'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Sg+Loc'] || '–') + '</td></tr>');
          $ParadigmTable1.append('<tr><td>Dat</td><td>' + (paradigmDict['+Msc+AnIn+Sg+Dat'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Sg+Dat'] || '–') + '</td></tr>');

          var insMsc = paradigmDict['+Msc+AnIn+Sg+Ins'];
          var insMscLeng = paradigmDict['+Msc+AnIn+Sg+Ins+Leng'];
          if(insMsc == null && insMscLeng == null) {
            insMsc = '–';
          } else if(insMsc == null) {
            insMsc = insMscLeng;
          } else if(insMsc != null && insMscLeng != null){
            insMsc = insMsc + '/<br/>' + insMscLeng;
          }

          var insNeu = paradigmDict['+Neu+AnIn+Sg+Ins'];
          var insNeuLeng = paradigmDict['+Neu+AnIn+Sg+Ins+Leng'];
          if(insNeu == null && insNeuLeng == null) {
            insNeu = '–';
          } else if(insNeu == null) {
            insNeu = insNeuLeng;
          } else if(insNeu != null && insNeuLeng != null) {
            insNeu = insNeu + '/<br/>' + insNeuLeng;
          }

          $ParadigmTable1.append('<tr><td>Ins</td><td>' + insMsc + '</td><td>' + insNeu + '</td></tr>');
          if(paradigmDict["pos"] == "A") {
            $ParadigmTable1.append('<tr><td>Pred</td><td>' + (paradigmDict['+Msc+Sg+Pred'] || '–') + '</td><td>' + (paradigmDict['+Neu+Sg+Pred'] || '–') + '</td></tr>');
          }
          $ParadigmContainer.append($ParadigmTable1);

          const $ParadigmTable2 = $("<table>");
          $ParadigmTable2.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable2.append('<tr><th>Case</th><th>Feminine</th><th>Plural</th></tr>');
          $ParadigmTable2.append('<tr><td>Nom</td><td>' + (paradigmDict['+Fem+AnIn+Sg+Nom'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Pl+Nom'] || '–') + '</td></tr>');

          var accFem = paradigmDict['+Fem+AnIn+Sg+Acc'];
          var accFemInan = paradigmDict['+Fem+Inan+Sg+Acc'];
          var accFemAnim = paradigmDict['+Fem+Anim+Sg+Acc'];
          if(accFem == null) {
            if(accFemInan != null && accFemAnim != null) {
              accFem = accFemInan + '/<br/>' + accFemAnim;
            }
            else if(accFemInan == null && accFemAnim == null) {
              accFem = '–';
            }
            else {
              accFem = (accFemInan || '') + (accFemAnim || '');
            }
          }

          var accMFN = paradigmDict['+MFN+AnIn+Pl+Acc'];
          var accMFNInan = paradigmDict['+MFN+Inan+Pl+Acc'];
          var accMFNAnim = paradigmDict['+MFN+Anim+Pl+Acc'];
          if(accMFN == null) {
            if(accMFNInan != null && accMFNAnim != null) {
              accMFN = accMFNInan + '/<br/>' + accMFNAnim;
            }
            else if(accMFNInan == null && accMFNAnim == null) {
              accMFN = '–';
            }
            else {
              accMFN = (accMFNInan || '') + (accMFNAnim || '');
            }
          }

          $ParadigmTable2.append('<tr><td>Acc</td><td>' + accFem + '</td><td>' + accMFN + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Gen</td><td>' + (paradigmDict['+Fem+AnIn+Sg+Gen'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Pl+Gen'] || '–') + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Prep</td><td>' + (paradigmDict['+Fem+AnIn+Sg+Loc'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Pl+Loc'] || '–') + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Dat</td><td>' + (paradigmDict['+Fem+AnIn+Sg+Dat'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Pl+Dat'] || '–') + '</td></tr>');

          var insFem = paradigmDict['+Fem+AnIn+Sg+Ins'];
          var insFemLeng = paradigmDict['+Fem+AnIn+Sg+Ins+Leng'];
          if(insFem == null && insFemLeng == null) {
            insFem = '–';
          } else if(insFem == null) {
            insFem = insFemLeng;
          } else if(insFem != null && insFemLeng != null){
            insFem = insFem + '/<br/>' + insFemLeng;
          }

          var insMFN = paradigmDict['+MFN+AnIn+Pl+Ins'];
          var insMFNLeng = paradigmDict['+MFN+AnIn+Pl+Ins+Leng'];
          if(insMFN == null && insMFNLeng == null) {
            insMFN = '–';
          } else if(insMFN == null) {
            insMFN = insMFNLeng;
          } else if(insMFN != null && insMFNLeng != null) {
            insMFN = insMFN + '/<br/>' + insMFNLeng;
          }

          $ParadigmTable2.append('<tr><td>Ins</td><td>' + insFem + '</td><td>' + insMFN + '</td></tr>');
          if(paradigmDict["pos"] == "A") {
            $ParadigmTable2.append('<tr><td>Pred</td><td>' + (paradigmDict['+Fem+Sg+Pred'] || '–') + '</td><td>' + (paradigmDict['+MFN+Pl+Pred'] || '–') + '</td></tr>');
          }
          $ParadigmContainer.append($ParadigmTable2);

          if(paradigmDict["pos"] == "A" && paradigmDict['+Cmpar+Pred'] != null) {
            const $ParadigmTable3 = $("<table>");
            $ParadigmTable3.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable3.append('<tr><th>Comp. Pred.</th><td>' + (paradigmDict['+Cmpar+Pred'] || '–') + '</td></tr>');
            $ParadigmContainer.append($ParadigmTable3);
          }
        }
        else if(paradigmDict["pos"] == "V") {
          $ParadigmTitle.text("Verb Paradigm");

          const $ParadigmTable = $("<table>");
          $ParadigmTable.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable.append('<tr><th>Infinitive</th></tr>');
          $ParadigmTable.append('<tr><td>' + (paradigmDict['+Inf'] || '–') + '</td></tr>');
          $ParadigmContainer.append($ParadigmTable);

          const $ParadigmTable1 = $("<table>");
          $ParadigmTable1.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable1.append('<tr><th>Point Of View</th><th>Singular</th><th>Plural</th></tr>');
          if(paradigmDict["aspect"] == "Impf") {
            $ParadigmTable1.append('<tr><td>1st</td><td>' + (paradigmDict['+Prs+Sg1'] || '–') + '</td><td>' + (paradigmDict['+Prs+Pl1'] || '–') + '</td></tr>');
            $ParadigmTable1.append('<tr><td>2nd</td><td>' + (paradigmDict['+Prs+Sg2'] || '–') + '</td><td>' + (paradigmDict['+Prs+Pl2'] || '–') + '</td></tr>');
            $ParadigmTable1.append('<tr><td>3rd</td><td>' + (paradigmDict['+Prs+Sg3'] || '–') + '</td><td>' + (paradigmDict['+Prs+Pl3'] || '–') + '</td></tr>');
          }
          else if(paradigmDict["aspect"] == "Perf") {
            $ParadigmTable1.append('<tr><td>1st</td><td>' + (paradigmDict['+Fut+Sg1'] || '–') + '</td><td>' + (paradigmDict['+Fut+Pl1'] || '–') + '</td></tr>');
            $ParadigmTable1.append('<tr><td>2nd</td><td>' + (paradigmDict['+Fut+Sg2'] || '–') + '</td><td>' + (paradigmDict['+Fut+Pl2'] || '–') + '</td></tr>');
            $ParadigmTable1.append('<tr><td>3rd</td><td>' + (paradigmDict['+Fut+Sg3'] || '–') + '</td><td>' + (paradigmDict['+Fut+Pl3'] || '–') + '</td></tr>');
          }
          $ParadigmContainer.append($ParadigmTable1);

          const $ParadigmTable2 = $("<table>");
          $ParadigmTable2.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable2.append('<tr><th>Gender</th><th>Past Tense</th></tr>');
          $ParadigmTable2.append('<tr><td>Msc</td><td>' + (paradigmDict['+Pst+Msc+Sg'] || '–') + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Neu</td><td>' + (paradigmDict['+Pst+Neu+Sg'] || '–') + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Fem</td><td>' + (paradigmDict['+Pst+Fem+Sg'] || '–') + '</td></tr>');
          $ParadigmTable2.append('<tr><td>Pl</td><td>' + (paradigmDict['+Pst+MFN+Pl'] || '–') + '</td></tr>');
          $ParadigmContainer.append($ParadigmTable2);

          const $ParadigmTable3 = $("<table>");
          $ParadigmTable3.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable3.append('<tr><th>Imperative Sg</th><td>' + (paradigmDict['+Imp+Sg2'] || '–') + '</td></tr>');
          $ParadigmTable3.append('<tr><th>Imperative Pl</th><td>' + (paradigmDict['+Imp+Pl2'] || '–') + '</td></tr>');
          $ParadigmTable3.append('<tr><th>Present Gerund</th><td>' + (paradigmDict['+PrsAct+Adv'] || '–') + '</td></tr>');
          $ParadigmTable3.append('<tr><th>Past Gerund</th><td>' + (paradigmDict['+PstAct+Adv'] || '–') + '</td></tr>');
          $ParadigmContainer.append($ParadigmTable3);

          const $ParadigmTable4 = $("<table>");
          $ParadigmTable4.addClass("view-assistive-reading-paradigm-item");
          $ParadigmTable4.append('<tr><th>Participles</th><th>Active</th><th>Passive</th></tr>');
          $ParadigmTable4.append('<tr><td>Present</td><td>' + (paradigmDict['+PrsAct+Msc+AnIn+Sg+Nom'] || '–') + '</td><td>' + (paradigmDict['+PrsPss+Msc+AnIn+Sg+Nom'] || '–') + '</td></tr>');
          $ParadigmTable4.append('<tr><td>Past</td><td>' + (paradigmDict['+PstAct+Msc+AnIn+Sg+Nom'] || '–') + '</td><td>' + (paradigmDict['+PstPss+Msc+AnIn+Sg+Nom'] || '–') + '</td></tr>');
          $ParadigmContainer.append($ParadigmTable4);
        }
        else if(paradigmDict["pos"] == "Num") {
          const lemma = $EnhancementElement.data("lemma");
          $ParadigmTitle.text("Number Paradigm");

          if(lemma == "два" || lemma == "полтора") {
            const $ParadigmTable = $("<table>");
            $ParadigmTable.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable.append('<tr><th>Case</th><th>Msc</th><th>Neu</th></tr>');
            $ParadigmTable.append('<tr><td>Nom</td><td>' + (paradigmDict['+Msc+AnIn+Nom'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Nom'] || '–') + '</td></tr>');

            var accMsc = paradigmDict['+Msc+AnIn+Acc'];
            var accMscInan = paradigmDict['+Msc+Inan+Acc'];
            var accMscAnim = paradigmDict['+Msc+Anim+Acc'];
            if(accMsc == null) {
              if(accMscInan != null && accMscAnim != null) {
                accMsc = accMscInan + '/<br/>' + accMscAnim;
              }
              else if(accMscInan == null && accMscAnim == null) {
                accMsc = '–';
              }
              else {
                accMsc = (accMscInan || '') + (accMscAnim || '');
              }
            }

            var accNeu = paradigmDict['+Neu+AnIn+Acc'];
            var accNeuInan = paradigmDict['+Neu+Inan+Acc'];
            var accNeuAnim = paradigmDict['+Neu+Anim+Acc'];
            if(accNeu == null) {
              if(accNeuInan != null && accNeuAnim != null) {
                accNeu = accNeuInan + '/<br/>' + accNeuAnim;
              }
              else if(accNeuInan == null && accNeuAnim == null) {
                accNeu = '–';
              }
              else {
                accNeu = (accNeuInan || '') + (accNeuAnim || '');
              }
            }

            $ParadigmTable.append('<tr><td>Acc</td><td>' + accMsc + '</td><td>' + accNeu + '</td></tr>');
            $ParadigmTable.append('<tr><td>Gen</td><td>' + (paradigmDict['+MFN+AnIn+Gen'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Gen'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Prep</td><td>' + (paradigmDict['+MFN+AnIn+Loc'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Loc'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Dat</td><td>' + (paradigmDict['+MFN+AnIn+Dat'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Dat'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Ins</td><td>' + (paradigmDict['+MFN+AnIn+Ins'] || '–') + '</td><td>' + (paradigmDict['+MFN+AnIn+Ins'] || '–') + '</td></tr>');
            $ParadigmContainer.append($ParadigmTable);

            const $ParadigmTable2 = $("<table>");
            $ParadigmTable2.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable2.append('<tr><th>Case</th><th>Feminine</th></tr>');
            $ParadigmTable2.append('<tr><td>Nom</td><td>' + (paradigmDict['+Fem+AnIn+Nom'] || '–') + '</td></tr>');

            var accFem = paradigmDict['+Fem+AnIn+Acc'];
            var accFemInan = paradigmDict['+Fem+Inan+Acc'];
            var accFemAnim = paradigmDict['+Fem+Anim+Acc'];
            if(accFem == null) {
              if(accFemInan != null && accFemAnim != null) {
                accFem = accFemInan + '/<br/>' + accFemAnim;
              }
              else if(accFemInan == null && accFemAnim == null) {
                accFem = '–';
              }
              else {
                accFem = (accFemInan || '') + (accFemAnim || '');
              }
            }

            $ParadigmTable2.append('<tr><td>Acc</td><td>' + accFem + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Gen</td><td>' + (paradigmDict['+MFN+AnIn+Gen'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Prep</td><td>' + (paradigmDict['+MFN+AnIn+Loc'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Dat</td><td>' + (paradigmDict['+MFN+AnIn+Dat'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Ins</td><td>' + (paradigmDict['+MFN+AnIn+Ins'] || '–') + '</td></tr>');
            $ParadigmContainer.append($ParadigmTable2);
          }
          else if(lemma == "оба") {
            const $ParadigmTable = $("<table>");
            $ParadigmTable.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable.append('<tr><th>Case</th><th>Msc</th><th>Neu</th></tr>');
            $ParadigmTable.append('<tr><td>Nom</td><td>' + (paradigmDict['+Msc+AnIn+Nom'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Nom'] || '–') + '</td></tr>');

            var accMsc = paradigmDict['+Msc+AnIn+Acc'];
            var accMscInan = paradigmDict['+Msc+Inan+Acc'];
            var accMscAnim = paradigmDict['+Msc+Anim+Acc'];
            if(accMsc == null) {
              if(accMscInan != null && accMscAnim != null) {
                accMsc = accMscInan + '/<br/>' + accMscAnim;
              }
              else if(accMscInan == null && accMscAnim == null) {
                accMsc = '–';
              }
              else {
                accMsc = (accMscInan || '') + (accMscAnim || '');
              }
            }

            var accNeu = paradigmDict['+Neu+AnIn+Acc'];
            var accNeuInan = paradigmDict['+Neu+Inan+Acc'];
            var accNeuAnim = paradigmDict['+Neu+Anim+Acc'];
            if(accNeu == null) {
              if(accNeuInan != null && accNeuAnim != null) {
                accNeu = accNeuInan + '/<br/>' + accNeuAnim;
              }
              else if(accNeuInan == null && accNeuAnim == null) {
                accNeu = '–';
              }
              else {
                accNeu = (accNeuInan || '') + (accNeuAnim || '');
              }
            }

            $ParadigmTable.append('<tr><td>Acc</td><td>' + accMsc + '</td><td>' + accNeu + '</td></tr>');
            $ParadigmTable.append('<tr><td>Gen</td><td>' + (paradigmDict['+Msc+AnIn+Gen'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Gen'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Prep</td><td>' + (paradigmDict['+Msc+AnIn+Loc'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Loc'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Dat</td><td>' + (paradigmDict['+Msc+AnIn+Dat'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Dat'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Ins</td><td>' + (paradigmDict['+Msc+AnIn+Ins'] || '–') + '</td><td>' + (paradigmDict['+Neu+AnIn+Ins'] || '–') + '</td></tr>');
            $ParadigmContainer.append($ParadigmTable);

            const $ParadigmTable2 = $("<table>");
            $ParadigmTable2.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable2.append('<tr><th>Case</th><th>Feminine</th></tr>');
            $ParadigmTable2.append('<tr><td>Nom</td><td>' + (paradigmDict['+Fem+AnIn+Nom'] || '–') + '</td></tr>');

            var accFem = paradigmDict['+Fem+AnIn+Acc'];
            var accFemInan = paradigmDict['+Fem+Inan+Acc'];
            var accFemAnim = paradigmDict['+Fem+Anim+Acc'];
            if(accFem == null) {
              if(accFemInan != null && accFemAnim != null) {
                accFem = accFemInan + '/<br/>' + accFemAnim;
              }
              else if(accFemInan == null && accFemAnim == null) {
                accFem = '–';
              }
              else {
                accFem = (accFemInan || '') + (accFemAnim || '');
              }
            }

            $ParadigmTable2.append('<tr><td>Acc</td><td>' + accFem + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Gen</td><td>' + (paradigmDict['+Fem+AnIn+Gen'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Prep</td><td>' + (paradigmDict['+Fem+AnIn+Loc'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Dat</td><td>' + (paradigmDict['+Fem+AnIn+Dat'] || '–') + '</td></tr>');
            $ParadigmTable2.append('<tr><td>Ins</td><td>' + (paradigmDict['+Fem+AnIn+Ins'] || '–') + '</td></tr>');
            $ParadigmContainer.append($ParadigmTable2);
          }
          else {
            const $ParadigmTable = $("<table>");
            $ParadigmTable.addClass("view-assistive-reading-paradigm-item");
            $ParadigmTable.append('<tr><th>Case</th><th>Singular</th></tr>');
            $ParadigmTable.append('<tr><td>Nom</td><td>' + (paradigmDict['+Nom'] || '–') + '</td></tr>');

            var acc = paradigmDict["+Acc"];
            if(acc == null && paradigmDict["+Msc+Anim+Acc"] != null && paradigmDict["+Msc+Inan+Acc"] != null) {
              acc = paradigmDict["+Msc+Anim+Acc"] + '/<br/>' + paradigmDict["+Msc+Inan+Acc"];
            }
            else if(acc == null) {
              acc = '–';
            }

            $ParadigmTable.append('<tr><td>Acc</td><td>' + acc + '</td></tr>');
            $ParadigmTable.append('<tr><td>Gen</td><td>' + (paradigmDict['+Gen'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Prep</td><td>' + (paradigmDict['+Loc'] || '–') + '</td></tr>');
            $ParadigmTable.append('<tr><td>Dat</td><td>' + (paradigmDict['+Dat'] || '–') + '</td></tr>');

            var ins = paradigmDict['+Ins'];
            var insLeng = paradigmDict['+Ins+Leng'];
            if(ins == null && insLeng == null) {
              ins = '–';
            } else if(ins == null) {
              ins = insLeng;
            } else if(ins != null && insLeng != null) {
              ins = ins + '/<br/>' + insLeng;
            }

            $ParadigmTable.append('<tr><td>Ins</td><td>' + ins + '</td></tr>');

            $ParadigmContainer.append($ParadigmTable);
          }
        }
      });

    }
  };
};
