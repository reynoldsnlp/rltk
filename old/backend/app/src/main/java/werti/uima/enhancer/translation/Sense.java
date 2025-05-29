
package werti.uima.enhancer.translation;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.commons.lang.builder.ToStringBuilder;

public class Sense {

    private List<String> glosses = null;
    private List<String> tags = null;
    private List<String> altOf = null;
    private List<String> nonglosses = null;
    private List<String> wikipedia = null;
    private List<String> inflectionOf = null;
    private Map<String, Object> additionalProperties = new HashMap<String, Object>();

    /**
     * No args constructor for use in serialization
     * 
     */
    public Sense() {
    }

    /**
     * 
     * @param tags
     * @param altOf
     * @param wikipedia
     * @param nonglosses
     * @param inflectionOf
     * @param glosses
     */
    public Sense(List<String> glosses, List<String> tags, List<String> altOf, List<String> nonglosses, List<String> wikipedia, List<String> inflectionOf) {
        super();
        this.glosses = glosses;
        this.tags = tags;
        this.altOf = altOf;
        this.nonglosses = nonglosses;
        this.wikipedia = wikipedia;
        this.inflectionOf = inflectionOf;
    }

    public List<String> getGlosses() {
        return glosses;
    }

    public void setGlosses(List<String> glosses) {
        this.glosses = glosses;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<String> getAltOf() {
        return altOf;
    }

    public void setAltOf(List<String> altOf) {
        this.altOf = altOf;
    }

    public List<String> getNonglosses() {
        return nonglosses;
    }

    public void setNonglosses(List<String> nonglosses) {
        this.nonglosses = nonglosses;
    }

    public List<String> getWikipedia() {
        return wikipedia;
    }

    public void setWikipedia(List<String> wikipedia) {
        this.wikipedia = wikipedia;
    }

    public List<String> getInflectionOf() {
        return inflectionOf;
    }

    public void setInflectionOf(List<String> inflectionOf) {
        this.inflectionOf = inflectionOf;
    }

    public Map<String, Object> getAdditionalProperties() {
        return this.additionalProperties;
    }

    public void setAdditionalProperty(String name, Object value) {
        this.additionalProperties.put(name, value);
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this).append("glosses", glosses).append("tags", tags).append("altOf", altOf).append("nonglosses", nonglosses).append("wikipedia", wikipedia).append("inflectionOf", inflectionOf).append("additionalProperties", additionalProperties).toString();
    }

}
