package werti.server.enhancement;

import com.google.gson.reflect.TypeToken;
import org.apache.uima.jcas.tcas.Annotation;
import werti.uima.types.EnhancementAnnotation;

import java.util.List;
import java.util.Map;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-09
 */
public class ViewEnhancement extends Enhancement {
    public ViewEnhancement(final Annotation annotation) {
        super(annotation);
    }

    public ViewEnhancement(final EnhancementAnnotation enhancementAnnotation) {
        super(enhancementAnnotation);
        final String data = enhancementAnnotation.getData();
        if (data != null) {
            addAllAttributes(gson.fromJson(
                    data,
                    new TypeToken<Map<String, List<String>>>() {}.getType()
            ));
        }
    }

    public ViewEnhancement(int start, int end) {
        super(start, end);
    }

    public ViewEnhancement(Span span) {
        super(span);
    }

    @Override
    protected String getTagName() {
        return "viewEnhancement";
    }
}
