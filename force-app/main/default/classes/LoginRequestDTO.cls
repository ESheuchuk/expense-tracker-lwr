/**
 * Request payload from LWC. Properties need { get; set; }: the Aura deserializer does not populate plain fields.
 */
public with sharing class LoginRequestDTO {
    @AuraEnabled
    public String email { get; set; }
    @AuraEnabled
    public String password { get; set; }
    @AuraEnabled
    public String startUrl { get; set; }
}
