#include <iostream>
using namespace std;
class person{
    public:
    string name;
    int age ;
};
class student:virtual public person{
    public:
    int ID;
};
class faculty:virtual public person{
    public:
    string deprtment ;

};
class TA:public student,public faculty{
    public:
    int Batch;
    void display(){
        cout<< name<< age<< ID<< deprtment<< Batch;
    }
};
int main(){
    TA t1;
    t1.name = "santo";
    t1.age = 21;
    t1.ID = 12345;
    t1.deprtment = "CSE";
    t1.Batch = 22;
    t1.display();
    return 0;
}