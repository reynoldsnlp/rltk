package werti.uima.ae.util;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import werti.Language;
import werti.server.TestResourceFactory;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.Token;
import werti.util.HFSTAnalyser;
import werti.util.HFSTAnalyserMal;

import java.util.*;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 13.12.16
 */
public class Vislcg3OutputTransformerTest {

    private static HFSTAnalyser rusHfstAnalyser;
    private static HFSTAnalyserMal rusHfstAnalyserMal;
    private static HFSTAnalyser estHfstAnalyser;

    private AnalysisEngineDescription testPipe;
    private UimaTestService uimaService;
    private Vislcg3Process rusVislcg3Process;
    private Vislcg3Process estVislcg3Process;

    @Before
    public void loadAEAndHFSTAnalyser() throws Exception {
        testPipe = AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class);
        uimaService = new UimaTestService();
        rusHfstAnalyser = initHfstAnalyser(Language.RUSSIAN);
        rusHfstAnalyserMal = new HFSTAnalyserMal(
                new TestResourceFactory(uimaService.getViewContext()),
                Language.RUSSIAN
        );
        estHfstAnalyser = initHfstAnalyser(Language.ESTONIAN);
        rusVislcg3Process = initVislcg3Process(Language.RUSSIAN);
        estVislcg3Process = initVislcg3Process(Language.ESTONIAN);
    }

    private HFSTAnalyser initHfstAnalyser(Language language) throws Exception {
        return new HFSTAnalyser(
                new TestResourceFactory(uimaService.getViewContext()),
                language
        );
    }

    private Vislcg3Process initVislcg3Process(Language language) throws Exception {
        return new Vislcg3Process(
                uimaService.getViewContext(),
                language
        );
    }

    @Test
    public void withoutReadings() throws Exception {
        String text = "МАМА";
        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.RUSSIAN);

        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String vislcg3Output = rusVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        String expectedReadings = "";

        final String resultReadings = cgTokenList
                .stream()
                .map(CGToken::getAllReadings)
                .collect(Collectors.joining(" "));

        assertEquals(
                "The cg token should not have any readings.",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withRusReadings() throws Exception {
        String text = "города";
        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.RUSSIAN);

        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String vislcg3Output = rusVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("город+N+Msc+Inan+Pl+Nom",
                "город+N+Msc+Inan+Pl+Acc", "город+N+Msc+Inan+Sg+Gen"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(CGToken::getAllReadings)
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));

        assertEquals(
                "The cg token should have three readings.",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withRusReadingsAndTrace() throws Exception {
        String text = "за дом";

        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.RUSSIAN);
        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  rusVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String vislcg3Output = rusVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("за+Pr",
                "дом+N+Msc+Inan+Sg+Acc", ";дом+N+Msc+Inan+Sg+Nom"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(cgToken -> cgToken.getAllReadings().concat(cgToken.getAllRuledOutReadings()))
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));


        assertEquals(
                "There should be a cg token with one reading and " +
                        "a cg token with a reading and a reading with trace (;).",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withRusReadingsWithMalRules() throws Exception {
        String text = "отеца";
        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.RUSSIAN);

        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = rusHfstAnalyserMal.runTransducer(analyserInputList);

        List<String> argumentList =  rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String vislcg3Output = rusVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("отец+N+Msc+Anim+Sg+Acc+Err/L2_FV",
                "отец+N+Msc+Anim+Sg+Gen+Err/L2_FV"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(CGToken::getAllReadings)
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));

        assertEquals(
                "The cg token should have two erroneous readings.",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withRusReadingsAndTraceWithMalRules() throws Exception {
        String text = "от отеца";

        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.RUSSIAN);
        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = rusHfstAnalyserMal.runTransducer(analyserInputList);

        List<String> argumentList =  rusVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String vislcg3Output = rusVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("от+Pr",
                "отец+N+Msc+Anim+Sg+Gen+Err/L2_FV", ";отец+N+Msc+Anim+Sg+Acc+Err/L2_FV"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(cgToken -> cgToken.getAllReadings().concat(cgToken.getAllRuledOutReadings()))
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));

        assertEquals(
                "There should be a cg token with one reading and " +
                        "a cg token with an erroneous reading and " +
                        "an erroneous reading with trace (;).",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withEstReadings() throws Exception {
        String text = "Kõik";
        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.ESTONIAN);

        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  estVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String vislcg3Output = estVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("kõik+Pron+Pl+Nom", "kõik+Pron+Sg+Nom"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(CGToken::getAllReadings)
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));

        assertEquals(
                "The cg token should have two readings.",
                expectedReadings,
                resultReadings);
    }

    @Ignore @Test // TODO: remove @Ignore when you have dealt with compounds
    public void withEstReadingsCompound() throws Exception {
        String text = "südametunnistus"; // TODO: there should be one reading instead of two
        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.ESTONIAN);

        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  estVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String vislcg3Output = estVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        String expectedReadings =
                "süda+N+Sg+Gen#tunnistus+N+Sg+Nom";

        final String resultReadings = cgTokenList
                .stream()
                .map(CGToken::getAllReadings)
                .collect(Collectors.joining(" "));

        assertEquals(
                "The cg token should have one reading.",
                expectedReadings,
                resultReadings);
    }

    @Test
    public void withEstReadingsAndTrace() throws Exception {
        String text = "Kõik inimesed";

        final ConvenientCas cas = uimaService.analyseText(text, testPipe, Language.ESTONIAN);
        final Collection<Token> analyserInputList = cas.select(Token.class);

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList =  estVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String vislcg3Output = estVislcg3Process.runVislcg3(argumentList, analyses);

        List<CGToken> cgTokenList = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, cas.getCas());

        Set<String> expectedReadings = new HashSet<>(Arrays.asList("kõik+Pron+Pl+Nom",
                ";kõik+N+Sg+Nom", ";kõik+Pron+Sg+Nom", "inimene+N+Pl+Nom"));

        final String resultReadingsString = cgTokenList
                .stream()
                .map(cgToken -> cgToken.getAllReadings().concat(cgToken.getAllRuledOutReadings()))
                .collect(Collectors.joining(" "));

        final Set<String> resultReadings = new HashSet<>(Arrays.asList(resultReadingsString.split(" ")));

        assertEquals(
                "There should be a cg token with three readings " +
                        "two of which with trace (;) and " +
                        "a cg token with one reading.",
                expectedReadings,
                resultReadings);
    }
}
