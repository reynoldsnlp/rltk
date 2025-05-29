package werti.util;

import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.TestResourceFactory;

import java.util.HashSet;
import java.util.Set;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class HFSTGeneratorTest {

    private static HFSTGenerator rusHfstGenerator;
    private static HFSTGenerator estHfstGenerator;

    @Before
    public void loadHFSTGenerator() throws Exception {
        rusHfstGenerator = new HFSTGenerator(new TestResourceFactory(), Language.RUSSIAN);
        estHfstGenerator = new HFSTGenerator(new TestResourceFactory(), Language.ESTONIAN);
    }

    @Test
    public void rusInvalidInput() {
        Set<String> expectedAnalyses = new HashSet<>();

        Set<String> resultAnalyses = rusHfstGenerator.runTransducer("кондуктор");


        assertEquals(
                "There should be no word forms.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void rusValidInput() {
        Set<String> expectedAnalyses = new HashSet<>();
        expectedAnalyses.add("кондуктора");
        expectedAnalyses.add("кондукторы");

        Set<String> resultAnalyses = rusHfstGenerator.runTransducer("кондуктор+N+Msc+Anim+Pl+Nom");


        assertEquals(
                "There should be two word forms.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estInvalidInput() {
        Set<String> expectedAnalyses = new HashSet<>();

        Set<String> resultAnalyses = estHfstGenerator.runTransducer("Kõik");


        assertEquals(
                "There should be no word forms.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estValidInput() {
        Set<String> expectedAnalyses = new HashSet<>();
        expectedAnalyses.add("kõik");

        Set<String> resultAnalyses = estHfstGenerator.runTransducer("kõik+N+Sg+Nom");


        assertEquals(
                "There should be one word form.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estValidInputCompound() {
        Set<String> expectedAnalyses = new HashSet<>();
        expectedAnalyses.add("võrdsetena");

        Set<String> resultAnalyses = estHfstGenerator.runTransducer("võrdne+A+prefix#sete+N+Sg+Nom#na+Adv");


        assertEquals(
                "There should be one word form.",
                expectedAnalyses,
                resultAnalyses);
    }
}
