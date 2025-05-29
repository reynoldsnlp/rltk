package werti.util;

import werti.Language;
import werti.ViewContext;
import werti.resources.NoResourceException;
import werti.server.TestResourceFactory;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-15
 */
public class RussianTestUtilities {
    private final KryoSerialization kryoSerialization;
    private final RusEnhancerUtils enhancerUtils;
    private final HFSTGenerator hfstGenerator;
    private final RusDistractorGenerator distractorGenerator;
    private final RussianEnhancementCreator enhancementCreator;

    public RussianTestUtilities(ViewContext viewContext) throws NoResourceException {
        kryoSerialization = new KryoSerialization(viewContext);
        enhancerUtils = new RusEnhancerUtils();
        hfstGenerator = new HFSTGenerator(new TestResourceFactory(viewContext), Language.RUSSIAN);
        distractorGenerator = new RusDistractorGenerator(
                enhancerUtils,
                hfstGenerator,
                kryoSerialization.loadMap("imperfectiveToPerfectiveVerbMap"),
                kryoSerialization.loadMap("perfectiveToImperfectiveVerbMap")
        );
        enhancementCreator = new RussianEnhancementCreator(
                hfstGenerator,
                enhancerUtils,
                distractorGenerator
        );
    }

    public RusEnhancerUtils getEnhancerUtils() {
        return enhancerUtils;
    }

    public HFSTGenerator getHfstGenerator() {
        return hfstGenerator;
    }

    public KryoSerialization getKryoSerialization() {
        return kryoSerialization;
    }

    public RusDistractorGenerator getDistractorGenerator() {
        return distractorGenerator;
    }

    public RussianEnhancementCreator getEnhancementCreator() {
        return enhancementCreator;
    }
}
