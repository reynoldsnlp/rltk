
package werti.uima.enhancer.translation;

import java.util.HashMap;
import java.util.Map;
import org.apache.commons.lang.builder.ToStringBuilder;

public class Conjugation {

    private String _1;
    private String _2;
    private String templateName;
    private String old;
    private String _3;
    private Map<String, Object> additionalProperties = new HashMap<String, Object>();

    /**
     * No args constructor for use in serialization
     * 
     */
    public Conjugation() {
    }

    /**
     * 
     * @param old
     * @param _3
     * @param _1
     * @param templateName
     * @param _2
     */
    public Conjugation(String _1, String _2, String templateName, String old, String _3) {
        super();
        this._1 = _1;
        this._2 = _2;
        this.templateName = templateName;
        this.old = old;
        this._3 = _3;
    }

    public String get1() {
        return _1;
    }

    public void set1(String _1) {
        this._1 = _1;
    }

    public String get2() {
        return _2;
    }

    public void set2(String _2) {
        this._2 = _2;
    }

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public String getOld() {
        return old;
    }

    public void setOld(String old) {
        this.old = old;
    }

    public String get3() {
        return _3;
    }

    public void set3(String _3) {
        this._3 = _3;
    }

    public Map<String, Object> getAdditionalProperties() {
        return this.additionalProperties;
    }

    public void setAdditionalProperty(String name, Object value) {
        this.additionalProperties.put(name, value);
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this).append("_1", _1).append("_2", _2).append("templateName", templateName).append("old", old).append("_3", _3).append("additionalProperties", additionalProperties).toString();
    }

}
