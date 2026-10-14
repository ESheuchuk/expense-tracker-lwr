/**
 * Request payload from LWC. Properties need { get; set; }: the Aura deserializer does not populate plain fields.
 */
public with sharing class RegistrationRequestDTO {
    @AuraEnabled
    public String firstName { get; set; }
    @AuraEnabled
    public String lastName { get; set; }
    @AuraEnabled
    public String email { get; set; }
    @AuraEnabled
    public String password { get; set; }
    @AuraEnabled
    public String confirmPassword { get; set; }
}
