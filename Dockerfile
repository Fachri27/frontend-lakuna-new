# Frontend Lakuna Foto — image DEV (vite dev + HMR, volume bind di compose).
# --host wajib supaya tunnel di host bisa meneruskan ke container.
FROM node:22-alpine
WORKDIR /srv/frontend
# Jalan sebagai user `node` (uid 1000), bukan root.
RUN chown node:node /srv/frontend
USER node
COPY --chown=node:node package*.json ./
RUN npm install --no-audit --no-fund
COPY --chown=node:node . .
EXPOSE 3002
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
