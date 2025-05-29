package werti.endtoend.topics;

import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.Topic;
import werti.server.data.Topics;

import static org.junit.Assert.assertNotEquals;

/**
 * Test if all topic pipeline descriptors and all its component files exist.
 *
 * @author Eduard Schaf
 * @since 17.10.17
 */
public class TopicPipelineTest {
    private Topics topics;

    @Before
    public void setup() throws Exception {
        topics = TestTopics.getRealTopics();
    }

    @Test
    public void pipelineDescriptorsExist() throws Exception {
        for(Language language: Language.values()){
            for(Topic topic : topics.getTopicsFor(language)) {
                assertNotEquals(
                        "There should be some pipeline components.",
                        0,
                        topic.getPipelineFor(language).get().assemble().getDelegateAnalysisEngineSpecifiers().size()
                );
            }
        }
    }
}
