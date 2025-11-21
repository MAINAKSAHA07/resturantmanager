.PHONY: dev build seed backup clean

dev:
	docker-compose up -d pocketbase
	npm install
	npm run dev

build:
	docker-compose build

seed:
	docker-compose up -d pocketbase
	sleep 5
	node pocketbase/scripts/seed.js

backup:
	docker-compose run --rm backup

clean:
	docker-compose down -v
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/.next
	rm -rf packages/*/dist

start:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f



