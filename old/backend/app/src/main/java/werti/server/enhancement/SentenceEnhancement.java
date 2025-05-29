package werti.server.enhancement;

import org.apache.uima.jcas.tcas.Annotation;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-14
 */
public class SentenceEnhancement extends Enhancement {
    public SentenceEnhancement(Annotation annotation) {
        super(annotation);
    }

    @Override
    protected String getTagName() {
        return "sentence";
    }
}
