
package werti.uima.enhancer.translation;

import java.util.HashMap;
import java.util.Map;
import org.apache.commons.lang.builder.ToStringBuilder;

public class Head {

    private String _1;
    private String _2;
    private String comp2;
    private String _3;
    private String templateName;
    private String _4;
    private String _5;
    private String _6;
    private String head;
    private String manual;
    private String cat2;
    private String indecl;
    private String tr;
    private Map<String, Object> additionalProperties = new HashMap<String, Object>();

    /**
     * No args constructor for use in serialization
     * 
     */
    public Head() {
    }

    /**
     * 
     * @param tr
     * @param indecl
     * @param comp2
     * @param manual
     * @param cat2
     * @param _3
     * @param _4
     * @param _5
     * @param _6
     * @param head
     * @param _1
     * @param _2
     * @param templateName
     */
    public Head(String _1, String _2, String comp2, String _3, String templateName, String _4, String _5, String _6, String head, String manual, String cat2, String indecl, String tr) {
        super();
        this._1 = _1;
        this._2 = _2;
        this.comp2 = comp2;
        this._3 = _3;
        this.templateName = templateName;
        this._4 = _4;
        this._5 = _5;
        this._6 = _6;
        this.head = head;
        this.manual = manual;
        this.cat2 = cat2;
        this.indecl = indecl;
        this.tr = tr;
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

    public String getComp2() {
        return comp2;
    }

    public void setComp2(String comp2) {
        this.comp2 = comp2;
    }

    public String get3() {
        return _3;
    }

    public void set3(String _3) {
        this._3 = _3;
    }

    public String getTemplateName() {
        return templateName;
    }

    public void setTemplateName(String templateName) {
        this.templateName = templateName;
    }

    public String get4() {
        return _4;
    }

    public void set4(String _4) {
        this._4 = _4;
    }

    public String get5() {
        return _5;
    }

    public void set5(String _5) {
        this._5 = _5;
    }

    public String get6() {
        return _6;
    }

    public void set6(String _6) {
        this._6 = _6;
    }

    public String getHead() {
        return head;
    }

    public void setHead(String head) {
        this.head = head;
    }

    public String getManual() {
        return manual;
    }

    public void setManual(String manual) {
        this.manual = manual;
    }

    public String getCat2() {
        return cat2;
    }

    public void setCat2(String cat2) {
        this.cat2 = cat2;
    }

    public String getIndecl() {
        return indecl;
    }

    public void setIndecl(String indecl) {
        this.indecl = indecl;
    }

    public String getTr() {
        return tr;
    }

    public void setTr(String tr) {
        this.tr = tr;
    }

    public Map<String, Object> getAdditionalProperties() {
        return this.additionalProperties;
    }

    public void setAdditionalProperty(String name, Object value) {
        this.additionalProperties.put(name, value);
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this).append("_1", _1).append("_2", _2).append("comp2", comp2).append("_3", _3).append("templateName", templateName).append("_4", _4).append("_5", _5).append("_6", _6).append("head", head).append("manual", manual).append("cat2", cat2).append("indecl", indecl).append("tr", tr).append("additionalProperties", additionalProperties).toString();
    }

}
