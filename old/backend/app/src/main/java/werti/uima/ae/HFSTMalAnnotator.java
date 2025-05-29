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
import werti.resources.FileBackedResourceFactory;
import werti.resources.NoResourceException;
import werti.uima.ae.util.Vislcg3OutputTransformer;
import werti.uima.ae.util.Vislcg3Process;
import werti.uima.types.annot.CGToken;
import werti.uima.types.annot.Token;
import werti.util.CasUtils;
import werti.util.HFSTAnalyserMal;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Annotate a text using the external tools - hfst-based morph. analyser and vislcg3 
 * shallow syntactic parser. Uses HFSTAnalyserMal to analyse text.
 * 
 * @author Niels Ott?
 * @author Adriane Boyd
 * @author Heli Uibo
 * @author Eduard Schaf
 *
 */
public class HFSTMalAnnotator extends JCasAnnotator_ImplBase {
    @ExternalResource
	private FileBackedResourceFactory resourceFactory;
    @ExternalResource
    private ViewContext viewContext;

	private static final Logger log =
		LogManager.getLogger();

	private List<String> argumentList;

    private HFSTAnalyserMal hfstAnalyserMal;

	private Vislcg3Process vislcg3Process;

	@Override
	public void initialize(UimaContext aContext) throws ResourceInitializationException {
	    super.initialize(aContext);
		final Boolean isWithTrace = (Boolean) aContext.getConfigParameterValue("isWithTrace");
		final String language = (String) aContext.getConfigParameterValue("language");

		try {
			hfstAnalyserMal = new HFSTAnalyserMal(
                    resourceFactory,
                    Language.fromIsoCode(language).orElse(Language.RUSSIAN)
            );
		} catch (NoResourceException e) {
			throw new ResourceInitializationException(e);
		}

		vislcg3Process = new Vislcg3Process(
				viewContext,
				Language.fromIsoCode(language).orElse(Language.RUSSIAN)
		);

		if (isWithTrace) {
			argumentList = vislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();
		} else {
			argumentList = vislcg3Process.buildArgumentListConversionAndDisambiguation();
		}
	}

	@Override
	public void process(JCas jcas) throws AnalysisEngineProcessException {
		// stop processing if the client has requested it
		if (!CasUtils.isValid(jcas)) {
			return;
		}
		log.debug("Starting vislcg3 processing");

		final long startTime = System.currentTimeMillis();

		// collect original tokens here
    List<Token> originalTokens = new ArrayList<>(JCasUtil.select(jcas, Token.class));

        // stop processing if the input is empty
		if(originalTokens.isEmpty()){
            return;
		}

		try {
            // analyse tokens
			String analyses = hfstAnalyserMal.runTransducer(originalTokens);

			// run vislcg3
			log.info("running vislcg3");
			String vislcg3Output = runVislcg3Process(analyses);
			
			log.info("parsing CG output");
			List<CGToken> newTokens = Vislcg3OutputTransformer.toHFSTCGTokenList(vislcg3Output, jcas);
			
			if (newTokens.isEmpty()) {
				throw new IllegalArgumentException("CG3 output is empty!"); 
			}

			// assert that we got as many tokens back as we provided
			if (newTokens.size() != originalTokens.size()) {
				throw new IllegalArgumentException("Token list size mismatch: " +
						"Original tokens: " + originalTokens.size() + ", After CG3: " + newTokens.size()); 
			}
			
			log.info("Number of original tokens:"+originalTokens.size());
            
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

		log.info("Finished visclg3 processing");
		
		final long endTime = System.currentTimeMillis();

		log.info("Total execution time: " + (endTime - startTime)*0.001 + " seconds." );
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
