package werti.resources;

import opennlp.tools.ml.maxent.GISModel;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-31
 */
interface GisWrapper {
    GISModel get();
}
