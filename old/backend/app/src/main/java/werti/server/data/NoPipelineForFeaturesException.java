package werti.server.data;

import com.google.gson.Gson;

/**
 * @author Aleksandar Dimitrov
 * @since 2018-02-09
 */
public class NoPipelineForFeaturesException extends Exception {
    public NoPipelineForFeaturesException(FeatureData featureData) {
        super("No features could be found for specification:" + new Gson().toJson(featureData));
    }
}
