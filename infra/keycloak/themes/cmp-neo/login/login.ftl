<#import "template.ftl" as layout>
<#assign hasFieldErrors = messagesPerField.existsError("username", "password")>
<@layout.registrationLayout displayMessage=!hasFieldErrors>

  <h2 class="cmp-form-title">${msg("loginAccountTitle")}</h2>

  <form id="kc-form-login" action="${url.loginAction}" method="post">

    <#if !usernameHidden?? || !usernameHidden>
    <div class="cmp-field">
      <label class="cmp-label" for="username">
        <#if !realm.loginWithEmailAllowed>${msg("username")}
        <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
        <#else>${msg("email")}</#if>
      </label>
      <input class="cmp-input<#if hasFieldErrors> cmp-input--error</#if>"
             id="username" name="username" type="text"
             value="${login.username!""}"
             tabindex="1" autocomplete="username"
             <#if usernameEditDisabled!false>disabled</#if>
             autofocus>
    </div>
    </#if>

    <div class="cmp-field">
      <label class="cmp-label" for="password">${msg("password")}</label>
      <input class="cmp-input<#if hasFieldErrors> cmp-input--error</#if>"
             id="password" name="password" type="password"
             tabindex="2" autocomplete="current-password"
             <#if usernameHidden?? && usernameHidden>autofocus</#if>>
    </div>

    <#if hasFieldErrors>
      <div class="cmp-alert cmp-alert--error" role="alert">
        ${kcSanitize(messagesPerField.get("username", "password"))?no_esc}
      </div>
    </#if>

    <#if realm.rememberMe && !usernameEditDisabled!true>
    <div class="cmp-field cmp-field--inline">
      <label class="cmp-checkbox-label">
        <input class="cmp-checkbox" type="checkbox" id="rememberMe" name="rememberMe" tabindex="3"
               <#if login.rememberMe>checked</#if>>
        <span>${msg("rememberMe")}</span>
      </label>
    </div>
    </#if>

    <input type="hidden" id="id-hidden-input" name="credentialId"
           <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>>

    <button class="cmp-btn cmp-btn--primary" type="submit" tabindex="4" name="login">
      ${msg("doLogIn")}
    </button>

  </form>

  <div class="cmp-links">
    <#if realm.resetPasswordAllowed>
      <a href="${url.loginResetCredentialsUrl}">${msg("doForgotPassword")}</a>
    </#if>
    <#if realm.password && realm.registrationAllowed && !registrationDisabled!true>
      <a href="${url.registrationUrl}">${msg("doRegister")}</a>
    </#if>
  </div>

</@layout.registrationLayout>
