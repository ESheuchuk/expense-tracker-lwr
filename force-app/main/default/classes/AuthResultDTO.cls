public with sharing class AuthResultDTO {
    @AuraEnabled
    public String redirectUrl;

    public AuthResultDTO(String redirectUrl) {
        this.redirectUrl = redirectUrl;
    }
}
