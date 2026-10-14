/**
 * Request payload from LWC. Properties need { get; set; }: the Aura deserializer does not populate plain fields.
 */
public with sharing class ForgotPasswordRequestDTO {
    @AuraEnabled
    public String email { get; set; }
}
