package werti.server;

import com.google.common.collect.ImmutableSet;
import org.junit.Assert;
import org.junit.Test;
import werti.Language;
import werti.endtoend.topics.TestTopics;
import werti.server.views.DefaultView;
import werti.server.views.FirebaseApiData;

import java.util.List;


/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-28
 */
public class DefaultViewTest {
    @Test
    public void getLanguages() throws Exception {
        final DefaultView view = new DefaultView(
                TestTopics.getMockTopics(),
                FirebaseApiData.create("", "", "", "")
        );
        final List<Language> languages = view.getSupportedLanguages();
        Assert.assertEquals("We have five languages in VIEW", languages.size(), 5);
        Assert.assertTrue(
                "English, German, Russian, Spanish and Estonian are our languages",
                languages.containsAll(ImmutableSet.of(
                        Language.ENGLISH,
                        Language.GERMAN,
                        Language.RUSSIAN,
                        Language.SPANISH,
                        Language.ESTONIAN
                ))
        );
    }
}
