package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIndex;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.types.EnhancementAnnotation;
import werti.uima.types.annot.Token;
import werti.util.CasUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * An enhancement class that puts WERTi-<tt>&lt;span&gt;</tt>s around <em>all</em>
 * tokens and optionally gives them the attribute 'wertiviewhit' are in a word list.
 *
 * @author Aleksandar Dimitrov
 * @author Adriane Boyd
 * @version 0.1
 */

public class WordEnhancer extends JCasAnnotator_ImplBase {
	private static final Logger log =
		LogManager.getLogger();
	
	private List<String> words;
	
	@Override
	public void initialize(UimaContext context)
			throws ResourceInitializationException {
		super.initialize(context);

		List<String> configWords = Arrays.asList(((String)context.getConfigParameterValue("Words")).split(","));
		words = new ArrayList<String>();
		for(String word : configWords) {
			words.add(word.toLowerCase());
		}
	}

	/**
	 * Iterate over all tokens and put a span around them. If a token is in 
	 * the word list, then mark it up as a hit.
	 */
	@Override
	@SuppressWarnings("unchecked")
	public void process(JCas cas) throws AnalysisEngineProcessException {
		// stop processing if the client has requested it
		if (!CasUtils.isValid(cas)) {
			return;
		}
		
		int id = 0;
		log.debug("Starting enhancement");

		final FSIndex textIndex = cas.getAnnotationIndex(Token.type);
		final Iterator<Token> tit = textIndex.iterator();

		Token t;

		while (tit.hasNext()) {
			t = tit.next();
			// enhance all non-punctuation tokens
			if (t.getCoveredText().matches(".*[^\\p{P}].*")) {
				final EnhancementAnnotation e = new EnhancementAnnotation(cas);
				e.setBegin(t.getBegin());
				e.setEnd(t.getEnd());

				id++;
				final int hit;

				if (t.getCoveredText() == null) {
					log.debug("Encountered token with no text");
					hit = 0;
				} else if (words.contains(t.getCoveredText().toLowerCase())) {
					hit = 1;
				} else {
					hit = 0;
				}

				String hitclass = "";
				if (hit == 1) {
					hitclass = "wertiviewhit";
				}

				if (log.isTraceEnabled()) {
					log.trace("Enhanced " + t.getCoveredText()
							+ " with tag "
							+ t.getTag()
							+ " with id "
							+ id);
				}
				e.addToIndexes();
			
			}
		}
		log.debug("Finished enhancement");
	}

	
}
