package werti.server.cache;

import com.google.auto.value.AutoValue;
import org.jsoup.nodes.Document;
import werti.Language;
import werti.server.data.Topic;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-13
 */

@AutoValue
public abstract class AnalysisCacheKey {
    abstract int documentHash();
    abstract Language language();
    abstract Topic topic();

    public static AnalysisCacheKey create(Document document, Language language, Topic topic) {
        return new AutoValue_AnalysisCacheKey(document.hashCode(), language, topic);
    }
}
