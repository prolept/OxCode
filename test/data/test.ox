// #include <oxstd.oxh> there isn't oxmetrics in tests...
// #import <database>

class FakeClass
{   /** fakedoc */
    Call1(const un, const deux);
}
FakeClass::Call1(const un, const deux)
{

}
main()
{
decl db = new FakeClass();
db.Call1();
 
}




