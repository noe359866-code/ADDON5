p='test/titles.test.js'
s=open(p).read()
start=s.index("const interstellaresWikitext")
new = open('_scrape/new_tests.js').read()
s = s[:start] + new
open(p,'w').write(s)
print('ok')
