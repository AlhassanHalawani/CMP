<#import "template.ftl" as layout>
<#assign hasFieldErrors = messagesPerField.existsError("username")>
<@layout.registrationLayout displayMessage=!hasFieldErrors>

  <h2 class="cmp-form-title">${msg("emailForgotTitle")}</h2>

  <p class="cmp-info-text">
    <#if realm.loginWithEmailAllowed && !realm.registrationEmailAsUsername>
      ${msg("emailInstructionUsername")}
    <#else>
      ${msg("emailInstruction")}
    </#if>
  </p>

  <form id="kc-reset-password-form" action="${url.loginAction}" method="post">

    <div class="cmp-field">
      <label class="cmp-label" for="username">
        <#if !realm.loginWithEmailAllowed>${msg("username")}
        <#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}
        <#else>${msg("email")}</#if>
      </label>
      <input class="cmp-input<#if hasFieldErrors> cmp-input--error</#if>"
             id="username" name="username" type="text"
             value="${(auth.attemptedUsername!"")?html}"
             autofocus autocomplete="username">
      <#if hasFieldErrors>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("username"))?no_esc}</span>
      </#if>
    </div>

    <button class="cmp-btn cmp-btn--primary" type="submit">
      ${msg("doSubmit")}
    </button>

  </form>

  <div class="cmp-links">
    <a href="${url.loginUrl}">${msg("backToLogin")}</a>
  </div>

</@layout.registrationLayout>
