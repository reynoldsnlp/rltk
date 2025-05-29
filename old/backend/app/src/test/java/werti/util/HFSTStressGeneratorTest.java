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
public class HFSTStressGeneratorTest {

    private static HFSTStressGenerator hfstStressGenerator;

    @Before
    public void loadHFSTStressGenerator() throws Exception {
        hfstStressGenerator = new HFSTStressGenerator(new TestResourceFactory(), Language.RUSSIAN);
    }

    @Test
    public void invalidInput() {
        Set<String> expectedAnalyses = new HashSet<>();

        Set<String> resultAnalyses = hfstStressGenerator.runTransducer("кондуктор");

        assertEquals(
                "There should be no word forms with stress for the input.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void validInput() {
        Set<String> expectedAnalyses = new HashSet<>();
        expectedAnalyses.add("кондуктора́");
        expectedAnalyses.add("кондукто́ры");
        expectedAnalyses.add("конду́кторы");

        Set<String> resultAnalyses = hfstStressGenerator.runTransducer("кондуктор+N+Msc+Anim+Pl+Nom");


        assertEquals(
                "There should be three word forms with stress for the input.",
                expectedAnalyses,
                resultAnalyses);
    }
}
