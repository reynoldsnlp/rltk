package werti.uima.ae;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.analysis_engine.AnalysisEngineProcessException;
import org.apache.uima.fit.component.JCasAnnotator_ImplBase;
import org.apache.uima.fit.descriptor.ExternalResource;
import org.apache.uima.fit.util.JCasUtil;
import org.apache.uima.jcas.JCas;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.ViewContext;
import werti.uima.ae.util.Vislcg3OutputTransformer;
import werti.uima.ae.util.Vislcg3Process;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;
import werti.util.CasUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Annotate a text using the external vislcg3 program and the grammar 
 * provided by the activity.
 * 
 * @author Niels Ott?
 * @author Adriane Boyd
 *
 */
public class Vislcg3Annotator extends JCasAnnotator_ImplBase {
	@ExternalResource
	private ViewContext viewContext;

	private static final Logger log =
		LogManager.getLogger();
	
	public static final String CG_SENTENCE_BOUNDARY_TOKEN = "<SENT-END>";

	private List<String> argumentList;

	private Vislcg3Process vislcg3Process;

	@Override
	public void initialize(UimaContext aContext) throws ResourceInitializationException {
		super.initialize(aContext);
		vislcg3Process = new Vislcg3Process(
				viewContext,
				Language.ENGLISH
		);
		argumentList = vislcg3Process.buildArgumentListDisambiguation();
	}

	@Override
	public void process(JCas jcas) throws AnalysisEngineProcessException {
		// stop processing if the client has requested it
		if (!CasUtils.isValid(jcas)) {
			return;
		}
		
		log.debug("Starting vislcg3 processing");

		// collect original tokens here
		List<Token> originalTokens = new ArrayList<>(JCasUtil.select(jcas, Token.class));

		// collect original tokens here
		List<SentenceAnnotation> originalSentences =
				new ArrayList<>(JCasUtil.select(jcas, SentenceAnnotation.class));

		// convert token list to cg input
		String cg3input = toCG3Input(originalTokens, originalSentences);
		try {
			// run vislcg3
			String vislcg3Output = runVislcg3Process(cg3input);
			// parse cg output
			List<CGToken> newTokens = Vislcg3OutputTransformer.toGerundCGTokenList(vislcg3Output, jcas);
			// assert that we got as many tokens back as we provided
			if (newTokens.size() != originalTokens.size()) {
				throw new IllegalArgumentException("Token list size mismatch: " +
						"Original tokens: " + originalTokens.size() + ", After CG3: " + newTokens.size());
			}

			// complete new tokens with information from old ones
			for (int i = 0; i < originalTokens.size(); i++) {
				Token origT = originalTokens.get(i);
				CGToken newT = newTokens.get(i);
				copy(origT, newT);
				// update CAS
				jcas.removeFsFromIndexes(origT);
				jcas.addFsToIndexes(newT);
			}
		} catch (IOException | IllegalArgumentException e) {
			throw new AnalysisEngineProcessException(e);
		}

		log.debug("Finished visclg3 processing");
	}

	/**
	 * Helper for copying over information from Token to CGToken
	 *
	 * @param source the Token with the information
	 * @param target the CGToken receiving the information
	 */
	private void copy(Token source, CGToken target) {
		target.setBegin(source.getBegin());
		target.setEnd(source.getEnd());
		target.setTag(source.getTag());
		target.setLemma(source.getLemma());
		target.setGerund(source.getGerund());
	}

	/**
	 * Helper for converting Token annotations to a String for vislcg3.
	 *
	 * @param tokenList the tokens to convert
	 * @param sentList the sentences to take into account
	 * @return data that can be processed by vislcg3
	 */
	private String toCG3Input(List<Token> tokenList, List<SentenceAnnotation> sentList) {
		StringBuilder result = new StringBuilder();

		// figure out where sentences end in terms of positions in the text
		Set<Integer> sentenceEnds = new HashSet<>();

		for (SentenceAnnotation s : sentList) {
			sentenceEnds.add(s.getEnd());
		}
		
		boolean atSentBoundary = true;

		for (Token t : tokenList) {
			// convert any tokens not at the beginning of a sentence to lower case
			// sentence form is always: Nnnn nnn nnn nnn.
			String coveredText = t.getCoveredText();
			if (!atSentBoundary) {
				coveredText = coveredText.toLowerCase();
			} else {
				coveredText = coveredText.toUpperCase().substring(0, 1) + coveredText.toLowerCase().substring(1);
			}
			// switch to lower case if the current token is not a leading quote
			if (t.getTag() != null && !t.getTag().matches("(``|''|')") || "'|\"|‘|“)".equals(t.getCoveredText())) {
				atSentBoundary = false;
			}
			
			result.append("\"<").append(coveredText).append(">\"\n");
			result.append("\t\"");
			// TODO: figure out why the RELEVANT tags (and possibly other things)
			// break when lemmas are included
			/*if ( (!alwaysEmptyLemmas) && t.getLemma() != null) {
				result.append(t.getLemma());
			}*/
			result.append("\"");
			String tag = t.getTag();
			if (tag != null) {
				tag = tag.toUpperCase();
			} else {
				tag = "NOTAG";
			}
			result.append(" ").append(tag);

			if (sentenceEnds.contains(t.getEnd())) {
				result.append("\n\"" + CG_SENTENCE_BOUNDARY_TOKEN + "\"\n\t\"NOLEMMA\" NOTAG");
				atSentBoundary = true;
			}

			result.append("\n");
		}
		
		return result.toString();
	}

	/**
	 * Create a process for vislcg3 and run it on the provided analyses.
	 *
	 * @param analyses the data vislcg3 is processing
	 * @return the processed data returned from vislcg3
	 * @throws IOException when there is a problem with the process, buffered writer or reader
	 */
	private String runVislcg3Process(String analyses) throws IOException {
		return vislcg3Process.runVislcg3(argumentList, analyses);
	}
}
