# 기존 workers.dev 주소로 Google Search Console 사용하기

이 사이트는 도메인을 따로 구매하지 않고 기존 주소를 사용합니다.

```text
https://chocolate.flow-er123.workers.dev/
```

## 소유권 확인

1. [Search Console](https://search.google.com/search-console/)에서 속성 추가를 선택합니다.
2. **URL 접두어**에 위 HTTPS 주소를 마지막 `/`까지 넣습니다.
3. HTML 태그 방법을 선택합니다. 전달한 `google-site-verification` 값은 홈페이지 `<head>`에 적용했습니다.
4. 공개 홈페이지에서 태그를 확인한 뒤 Search Console에서 **확인**을 누릅니다.

workers.dev 전체 도메인을 소유한 것은 아니므로 **도메인 속성**의 DNS 확인을 사용하지 않습니다. 사용자에게 제공되는 하위 주소의 URL 접두어를 확인하는 방식입니다.

확인 태그는 공개 값이며 로그인 비밀이 아닙니다. Google이 주기적으로 확인할 수 있으므로 나중에 삭제하지 않습니다. 태그 배포와 Google 계정에서 소유권 확인을 마치는 것은 서로 다른 단계입니다.

## 사이트맵 제출

기능 배포 후 **색인 생성 → Sitemaps**에서 다음 주소를 제출합니다.

```text
https://chocolate.flow-er123.workers.dev/sitemap.xml
```

사이트맵에는 홈페이지, 용어 사전과 용어별 페이지, 전문 챕터와 챕터별 페이지, 보안 안내가 들어 있습니다. 예를 들어:

- `/glossary/http`: HTTP의 뜻·비유·예시.
- `/glossary/authorization`: 인증과 권한 검사 구별.
- `/chapters/http-authorization`: 요청과 접근 권한 챕터 설명.
- `/security`: 사이트의 보안 설정과 실습 범위.

이 페이지들은 로그인이나 JavaScript 실행 없이도 본문을 읽을 수 있습니다. `robots.txt`, 고유 제목·설명과 canonical 주소를 제공합니다. 실제 계정 API와 개인 랭크 진행은 검색 대상으로 삼지 않습니다.

## 등록 후 확인할 것

- URL 검사에 홈페이지와 대표 용어 페이지를 넣어 Google이 읽을 수 있는지 확인합니다.
- 필요한 대표 페이지는 색인 생성 요청을 합니다.
- 색인 생성 보고서에서 차단·404·중복 canonical 같은 문제가 있는지 확인합니다.
- 검색 실적의 노출·클릭·검색어를 보고 설명이 부족한 글을 보완합니다.

Search Console은 검색 수집과 성과를 확인하는 도구입니다. 광고를 자동으로 집행하거나 검색 노출·순위를 보장하지 않습니다. 읽을 수 있는 페이지를 준비하고, 유용한 설명과 실제 학습 내용을 꾸준히 보완해야 합니다.

공식 안내: [소유권 확인](https://support.google.com/webmasters/answer/9008080), [URL 접두어 속성](https://support.google.com/webmasters/answer/34592), [사이트맵 작성과 제출](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [JavaScript 검색 수집](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
