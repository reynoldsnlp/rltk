package werti.server.views;

import com.google.auto.value.AutoValue;
import com.google.gson.Gson;
import com.google.gson.TypeAdapter;
import werti.Language;
import werti.server.servlet.Fetchlet;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.Token;

import java.net.URL;
import java.time.Duration;

/**
 * Value type representing statistics about a prefetch that happened using
 * {@link Fetchlet}.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-05
 */
@AutoValue
public abstract class DocumentInfo {
    public static DocumentInfo create(
            final int tokens,
            final URL url,
            final Duration fetchTime,
            final Language language
    ) {
        return new AutoValue_DocumentInfo(tokens, url, fetchTime, language);
    }

    public abstract int tokens();
    public abstract URL url();
    public abstract Duration fetchTime();
    public abstract Language language();

    public static DocumentInfo createFromCas(
            final ConvenientCas cas,
            final URL url,
            final Duration fetchTime,
            final Language language
    ) {
        final int amountOfTokens = cas.select(Token.class).size();
        return DocumentInfo.create(amountOfTokens, url, fetchTime, language);
    }

    public static TypeAdapter<DocumentInfo> typeAdapter(Gson gson) {
        return new AutoValue_DocumentInfo.GsonTypeAdapter(gson);
    }
}
