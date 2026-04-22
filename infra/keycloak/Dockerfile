FROM quay.io/keycloak/keycloak:26.1

COPY realm-export.json /opt/keycloak/data/import/realm-export.json
COPY themes/cmp-neo /opt/keycloak/themes/cmp-neo

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--import-realm"]
