package werti.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.jcas.JCas;

/**
 * Produces an HTML document with enhancements from a CAS containing
 * Enhancements.
 * 
 * @author Adriane Boyd
 *
 */
public class HTMLEnhancer {
	private JCas cas;
	private static final Logger log =
			LogManager.getLogger();
	
	/**
	 * @param cCas CAS with annotations for the topic
	 */
	public HTMLEnhancer(final JCas cCas) {
		cas = cCas;
	}
}
