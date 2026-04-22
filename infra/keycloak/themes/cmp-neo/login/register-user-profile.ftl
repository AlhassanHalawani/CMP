<#import "template.ftl" as layout>
<@layout.registrationLayout>

  <h2 class="cmp-form-title">${msg("registerTitle")}</h2>

  <form id="kc-register-form" action="${url.registrationAction}" method="post">

    <#list profile.attributes as attribute>
      <#-- Skip password fields; handled separately below -->
      <#if attribute.name != "password" && attribute.name != "password-confirm">
        <#assign fieldName = attribute.name>
        <#assign fieldType = "text">
        <#if fieldName == "email">
          <#assign fieldType = "email">
        </#if>

        <div class="cmp-field">
          <label class="cmp-label" for="${fieldName}">
            ${advancedMsg(attribute.displayName)!fieldName}
            <#if attribute.required><span aria-hidden="true"> *</span></#if>
          </label>
          <input class="cmp-input<#if messagesPerField.existsError(fieldName)> cmp-input--error</#if>"
                 id="${fieldName}"
                 name="${fieldName}"
                 type="${fieldType}"
                 value="${(attribute.value!"")}"
                 <#if attribute.readOnly>disabled</#if>
                 <#if attribute?is_first>autofocus</#if>
                 <#if fieldType == "email">autocomplete="email"</#if>>
          <#if messagesPerField.existsError(fieldName)>
            <span class="cmp-field-error">${kcSanitize(messagesPerField.get(fieldName))?no_esc}</span>
          </#if>
        </div>
      </#if>
    </#list>

    <#if passwordRequired?? && passwordRequired>
    <div class="cmp-field">
      <label class="cmp-label" for="password">${msg("password")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password","password-confirm")> cmp-input--error</#if>"
             id="password" name="password" type="password"
             autocomplete="new-password">
      <#if messagesPerField.existsError("password")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password"))?no_esc}</span>
      </#if>
    </div>

    <div class="cmp-field">
      <label class="cmp-label" for="password-confirm">${msg("passwordConfirm")}</label>
      <input class="cmp-input<#if messagesPerField.existsError("password-confirm")> cmp-input--error</#if>"
             id="password-confirm" name="password-confirm" type="password"
             autocomplete="new-password">
      <#if messagesPerField.existsError("password-confirm")>
        <span class="cmp-field-error">${kcSanitize(messagesPerField.get("password-confirm"))?no_esc}</span>
      </#if>
    </div>
    </#if>

    <button class="cmp-btn cmp-btn--primary" type="submit">
      ${msg("doRegister")}
    </button>

  </form>

  <div class="cmp-links">
    <a href="${url.loginUrl}">${msg("backToLogin")}</a>
  </div>

</@layout.registrationLayout>
