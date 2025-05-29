package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.analysis_component.JCasAnnotator_ImplBase;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.cas.FSIndex;
import org.apache.uima.jcas.JCas;
import werti.uima.types.EnhancementAnnotation;
import werti.uima.types.annot.Block;
import werti.util.CasUtils;

import java.util.Iterator;

/**
 * An enhancer that adds classes for HTML content types.
 * Only for development purposes.
 *
 * @author Adriane Boyd
 * @version 0.1
 */

public class HTMLContentTypeEnhancer extends JCasAnnotator_ImplBase {
	private static final Logger log =
		LogManager.getLogger();

	/**
	 * Iterate over all <tt>Block</tt>s in the CAS and examine their
	 * htmlContentTypes.
	 *
	 * @param cas The document's CAS.
	 */
	@Override
	@SuppressWarnings("unchecked")
	public void process(JCas cas) throws AnalysisEngineProcessException {
		// stop processing if the client has requested it
		if (!CasUtils.isValid(cas)) {
			return;
		}
		
		int id = 0;
		log.debug("Starting HTML content type enhancement");
		
		final FSIndex textIndex = cas.getAnnotationIndex(Block.type);
		final Iterator<Block> tit = textIndex.iterator();

		log.debug("Feature Structure index size: " + textIndex.size());

		Block t;
		
		while (tit.hasNext()) {
			t = tit.next();
			if (t.getBlockName() == null) {
				log.debug("Encountered token with NULL tag");
				continue;
			}

			final EnhancementAnnotation e = new EnhancementAnnotation(cas);
			e.setBegin(t.getBegin());
			e.setEnd(t.getEnd());

			id++;
			//e.setEnhanceStart("<span id=\"" + EnhancerUtils.get_id("WERTi-span", id) +
			//		"\" class=\"wertiview" + t.getHtmlContentType() + "\">");
			//e.setEnhanceEnd("</span>");

			if (log.isTraceEnabled()) {
				log.trace("Enhanced " + t.getCoveredText()
						+ " with tag "
						+ t.getBlockName()
						+ " with id "
						+ id);
			}
			e.addToIndexes();
		}
		log.debug("Finished HTML content type enhancement");
	}
}
