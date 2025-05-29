package werti.util;

import org.junit.Before;
import org.junit.Test;
import werti.server.ViewTestContext;

import java.util.Map;

import static org.junit.Assert.assertTrue;

/**
 * @author Eduard Schaf
 * @since 20.12.16
 */
public class KryoSerializationTest {
    private KryoSerialization kryoSerialization;
    @Before
    public void fixContext() throws Exception {
        kryoSerialization = new KryoSerialization(ViewTestContext.createTestContext());
    }

    @Test
    public void loadSuccess() {
        Map<String, String> imperfectiveToPerfectiveVerbMap = kryoSerialization
                .loadMap("imperfectiveToPerfectiveVerbMap");

        assertTrue("The map should't be empty.",
                !imperfectiveToPerfectiveVerbMap.isEmpty());
    }

    @Test
    public void loadFailure() {
        Map<String, String> unavailableMap = kryoSerialization
                .loadMap("unavailableMap");

        assertTrue("The map should be empty.",
                unavailableMap.isEmpty());
    }
}
